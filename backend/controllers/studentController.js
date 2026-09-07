
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const BookingRequest = require("../models/BookingRequest");
const TutorProfile = require("../models/TutorProfile");
const Payment = require("../models/Payment");
const Review = require("../models/Review");
const Transaction = require("../models/Transaction");
const StudyNote = require("../models/StudyNote");
const StudyMaterial = require("../models/StudyMaterial");
const ClassSchedule = require("../models/ClassSchedule");
const Certificate = require("../models/Certificate");
const ChildProfile = require("../models/ChildProfile");
const PDFDocument = require("pdfkit");
const mongoose = require("mongoose");
const { createNotification, createAdminNotification } = require("../utils/notificationHelper");
const { logUserActivity } = require("../utils/activityLogHelper");
const referralController = require("./referralController");

/**
 * POST /api/student/book
 * Book demo class or regular session with a tutor
 */
exports.bookTutor = async (req, res) => {
  try {
    const {
      tutorProfileId,
      message,
      address,
      lat,
      lng,
      isHomeVisit,
      isTrial,
      scheduledDate,
      date,
      scheduledStartTime,
      scheduledEndTime,
      demoSlot,
      demoDay,
      subject,
    } = req.body;
    const student = await User.findById(req.user.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found. Please log in as a student.",
      });
    }

    let tutorProfile = null;
    if (tutorProfileId && mongoose.Types.ObjectId.isValid(tutorProfileId)) {
      tutorProfile = await TutorProfile.findById(tutorProfileId).populate("user");
      if (!tutorProfile) {
        tutorProfile = await TutorProfile.findOne({ user: tutorProfileId }).populate("user");
      }
    }

    if (!tutorProfile || !tutorProfile.user) {
      return res.status(404).json({
        success: false,
        message: "Specified tutor profile not found in database.",
      });
    }

    const isTrialRequest = isTrial !== undefined ? Boolean(isTrial) : true;
    const isPaidBooking = req.body.isPaid || req.body.paymentId;

    // Enforce One-Time Demo Class Restriction Per Student-Tutor Pair (Requirement 7)
    if (isTrialRequest) {
      const completedDemoBooking = await BookingRequest.exists({
        student: student._id,
        $or: [{ tutor: tutorProfile.user._id }, { tutorProfile: tutorProfile._id }],
        isTrial: true,
        $or: [{ status: "Completed" }, { homeVisitStatus: "Completed" }],
      });

      const completedDemoSchedule = await ClassSchedule.exists({
        student: student._id,
        tutor: tutorProfile.user._id,
        $or: [{ isTrial: true }, { classType: "demo" }],
        status: "Completed",
      });

      if (completedDemoBooking || completedDemoSchedule) {
        return res.status(400).json({
          success: false,
          message: "You have already completed a demo class with this tutor. Please book a regular class.",
        });
      }
    }

    const existing = await BookingRequest.findOne({
      student: student._id,
      tutorProfile: tutorProfile._id,
      isTrial: isTrialRequest,
      status: { $in: ["Pending", "Pending Admin Approval", "Pending Tutor Acceptance"] },
    });

    if (existing) {
      // If it's a paid regular class booking, update the existing request with payment details instead of blocking!
      if (!isTrialRequest && isPaidBooking) {
        existing.message = message || existing.message;
        existing.status = "Pending Admin Approval";
        await existing.save();

        return res.status(200).json({
          success: true,
          message: `Regular class booking for ${tutorProfile.user.name || "this tutor"} updated successfully with your payment!`,
          booking: existing,
        });
      }

      return res.status(400).json({
        success: false,
        message: isTrialRequest
          ? `You already have a pending demo class request for ${tutorProfile.user.name || "this tutor"}.`
          : `You already have a pending regular class request for ${tutorProfile.user.name || "this tutor"}.`,
      });
    }

    // Create Demo / Regular Booking Request (Do NOT create class schedule at this stage)
    const bookingDate = scheduledDate || date ? new Date(scheduledDate || date) : null;
    let sStart = scheduledStartTime || "18:00";
    let sEnd = scheduledEndTime || "19:00";
    if (demoSlot && (!scheduledStartTime || !scheduledEndTime)) {
      const parts = demoSlot.split(/[-–—]/).map((p) => p.trim());
      if (parts[0]) sStart = parts[0];
      if (parts[1]) sEnd = parts[1];
    }

    // Prevent duplicate booking for same tutor + date + time slot
    if (bookingDate) {
      const requestedDateStart = new Date(bookingDate);
      requestedDateStart.setHours(0, 0, 0, 0);
      const requestedDateEnd = new Date(bookingDate);
      requestedDateEnd.setHours(23, 59, 59, 999);

      const existingSlotCollision = await BookingRequest.findOne({
        tutorProfile: tutorProfile._id,
        scheduledDate: { $gte: requestedDateStart, $lte: requestedDateEnd },
        scheduledStartTime: sStart,
        status: { $nin: ["Rejected", "Rejected by Admin", "Rejected by Tutor", "Cancelled", "Discontinued"] },
      });

      const existingScheduleCollision = await ClassSchedule.findOne({
        tutor: tutorProfile.user._id,
        date: { $gte: requestedDateStart, $lte: requestedDateEnd },
        startTime: sStart,
        status: { $nin: ["Cancelled", "Discontinued", "Rejected"] },
      });

      if (existingSlotCollision || existingScheduleCollision) {
        return res.status(400).json({
          success: false,
          message: `The selected time slot (${sStart}) on this date is already booked with this tutor. Please choose a different date or time slot.`,
        });
      }
    }

    const booking = await BookingRequest.create({
      student: student._id,
      tutor: tutorProfile.user._id,
      tutorProfile: tutorProfile._id,
      message: message || "Demo Class Request",
      address: address || "",
      coordinates: {
        lat: lat !== undefined ? Number(lat) : 28.6139,
        lng: lng !== undefined ? Number(lng) : 77.2090,
      },
      isHomeVisit: Boolean(isHomeVisit),
      homeVisitStatus: isHomeVisit ? "Scheduled" : "N/A",
      isTrial: isTrialRequest,
      classType: isTrialRequest ? "demo" : "regular",
      date: bookingDate,
      scheduledDate: bookingDate,
      scheduledStartTime: sStart,
      scheduledEndTime: sEnd,
      demoSlot: demoSlot || (sStart && sEnd ? `${sStart} – ${sEnd}` : ""),
      demoDay: demoDay || "",
      subject: subject || tutorProfile.primarySubject || (Array.isArray(tutorProfile.subjects) ? tutorProfile.subjects[0] : "") || "Tuition",
      adminApproved: false,
      tutorApproved: false,
      adminRejected: false,
      tutorRejected: false,
      status: "Pending Admin Approval",
    });

    const studentName = student.name || student.email || "Student";
    const tutorName = (tutorProfile.user && tutorProfile.user.name) ? tutorProfile.user.name : "Tutor";
    const subjectName = tutorProfile.primarySubject || "Tuition";

    // Deliver Admin Notification for new Demo Class Request
    await createAdminNotification({
      title: "New Demo Class Request",
      message: `${studentName} has submitted a demo class request for tutor ${tutorName} (${subjectName}).`,
      sourceUser: student._id,
      sourceRole: "student",
      type: "tutor_request",
      actionUrl: "/dashboard/admin?tab=demo-requests",
      app: req.app,
    });

    await logUserActivity(student._id, `${studentName} booked a ${isTrial ? "demo" : "tuition"} class with ${tutorName}`, req.ip);

    return res.status(201).json({
      success: true,
      message: `Booking request sent successfully to ${tutorProfile.user.name || "Tutor"}!`,
      booking,
    });
  } catch (err) {
    console.error("Book Tutor Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.submitTutorRequest = async (req, res) => {
  try {
    const { subject, grade, board, budget, notes } = req.body;
    const student = await User.findById(req.user.id);

    if (!student) {
      return res.status(404).json({ success: false, message: "Student account not found." });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: "Subject is required." });
    }

    const booking = await BookingRequest.create({
      student: student._id,
      tutor: null,
      tutorProfile: null,
      message: `Custom Tutor Request: Subject: ${subject.trim()}, Grade: ${grade || 'N/A'}, Board: ${board || 'CBSE'}, Budget: ₹${budget || 'N/A'}/hr. Notes: ${notes || 'None'}`,
      address: notes || "",
      isTrial: true,
      status: "Pending",
    });

    const studentName = student.name || student.email || "Student";
    const formattedDate = new Date().toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Deliver Admin Notification ONLY after successful save
    await createAdminNotification({
      title: "New Demo Class Request",
      message: `${studentName} has submitted a new demo class request for ${subject.trim()}.`,
      sourceUser: student._id,
      sourceRole: "student",
      type: "tutor_request",
      actionUrl: "/dashboard/admin?tab=demo-requests",
      app: req.app,
    });

    await logUserActivity(student._id, `${studentName} submitted custom tutor request for ${subject.trim()}`, req.ip);

    return res.status(201).json({
      success: true,
      message: "Custom tutor request submitted successfully!",
      tutorRequest: booking,
    });
  } catch (err) {
    console.error("Submit Tutor Request Error:", err);
    return res.status(500).json({ success: false, message: "Server error submitting tutor request." });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const student = await User.findById(req.user.id).select("-password").populate("favorites");
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }
    return res.status(200).json({ success: true, student });
  } catch (error) {
    console.error("Get Student Profile Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getBookings = async (req, res) => {
  try {
    const bookings = await BookingRequest.find({ student: req.user.id })
      .populate({
        path: "tutorProfile",
        populate: { path: "user", select: "name email phone" },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, bookings });
  } catch (err) {
    console.error("Get Student Bookings Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};


exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await BookingRequest.findOne({ _id: id, student: req.user.id });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking request not found" });
    }

    booking.status = "Rejected";
    await booking.save();

    const populatedBooking = await BookingRequest.findById(id).populate({ path: "tutorProfile", populate: { path: "user", select: "name" } });
    const cancelTutorName = (populatedBooking && populatedBooking.tutorProfile && populatedBooking.tutorProfile.user) ? populatedBooking.tutorProfile.user.name : "Tutor";
    const studentName = req.user.name || "Student";
    await logUserActivity(req.user.id, `${studentName} cancelled the booking request for ${cancelTutorName}`, req.ip);

    return res.status(200).json({
      success: true,
      message: "Booking request cancelled.",
      booking,
    });
  } catch (err) {
    console.error("Cancel Booking Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.toggleFavorite = async (req, res) => {
  try {
    const { tutorProfileId } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const index = user.favorites.indexOf(tutorProfileId);
    let isFavorite = false;

    if (index > -1) {
      user.favorites.splice(index, 1);
      isFavorite = false;
    } else {
      user.favorites.push(tutorProfileId);
      isFavorite = true;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      isFavorite,
      message: isFavorite ? "Tutor saved to favorites!" : "Tutor removed from favorites.",
      favorites: user.favorites,
    });
  } catch (err) {
    console.error("Toggle Favorite Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: "favorites",
      populate: { path: "user", select: "name email phone" },
    });

    return res.status(200).json({
      success: true,
      favorites: user.favorites || [],
    });
  } catch (err) {
    console.error("Get Favorites Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
exports.addReview = async (req, res) => {
  try {
    const { tutorProfileId, rating, comment } = req.body;
    const studentId = req.user.id;

    if (!tutorProfileId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: "Tutor ID, rating (1-5), and review text are required.",
      });
    }

    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a number between 1 and 5.",
      });
    }

    const profile = await TutorProfile.findById(tutorProfileId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Tutor profile not found.",
      });
    }
    const hasBooking = await BookingRequest.findOne({
      student: studentId,
      $or: [
        { tutorProfile: tutorProfileId },
        { tutor: profile.user }
      ],
      status: "Accepted"
    });

    const hasCompletedClass = await ClassSchedule.findOne({
      student: studentId,
      tutor: profile.user,
      status: "Completed"
    });

    if (!hasBooking && !hasCompletedClass) {
      return res.status(403).json({
        success: false,
        message: "You can only review tutors with whom you have an accepted booking or completed class session.",
      });
    }
    let existingReview = await Review.findOne({
      tutorProfile: tutorProfileId,
      student: studentId,
    });

    let review;
    let isUpdate = false;

    if (existingReview) {
      existingReview.rating = numericRating;
      existingReview.comment = comment.trim();
      review = await existingReview.save();
      isUpdate = true;
    } else {
      review = await Review.create({
        tutorProfile: tutorProfileId,
        student: studentId,
        rating: numericRating,
        comment: comment.trim(),
      });
    }
    const reviews = await Review.find({ tutorProfile: tutorProfileId });
    const totalReviews = reviews.length;
    const sumRatings = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = totalReviews > 0 ? Number((sumRatings / totalReviews).toFixed(1)) : 0;

    await TutorProfile.findByIdAndUpdate(
      tutorProfileId,
      {
        rating: avgRating,
        totalReviews,
      },
      { new: true }
    );

    if (profile && profile.user) {
      await createNotification({
        userId: profile.user,
        title: isUpdate ? "Review Updated" : "New Review Received",
        message: `A student rated your profile ${numericRating} stars: "${comment.trim().substring(0, 40)}..."`,
        type: "system",
        app: req.app,
      });
    }

    const reviewStudentName = req.user.name || "Student";
    const reviewTutorName = (profile && profile.user && profile.user.name) ? profile.user.name : "Tutor";
    await logUserActivity(studentId, `${reviewStudentName} ${isUpdate ? "updated" : "submitted"} a review for ${reviewTutorName}`, req.ip);

    return res.status(isUpdate ? 200 : 201).json({
      success: true,
      message: isUpdate ? "Review updated successfully!" : "Review submitted successfully!",
      review,
      avgRating,
      totalReviews,
    });
  } catch (err) {
    console.error("Add Review Error:", err);
    return res.status(500).json({ success: false, message: "Server Error submitting review." });
  }
};
exports.getStudentReviewForTutor = async (req, res) => {
  try {
    const { tutorProfileId } = req.params;
    const studentId = req.user.id;

    const review = await Review.findOne({
      tutorProfile: tutorProfileId,
      student: studentId,
    });

    return res.status(200).json({
      success: true,
      review: review || null,
    });
  } catch (err) {
    console.error("Get Student Review Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
exports.topupWallet = async (req, res) => {
  return res.status(400).json({
    success: false,
    message: "Direct unverified wallet top-ups are disabled. All wallet credits must be processed through Razorpay payment verification.",
  });
};

const getActiveRegularTutorsForStudent = async (userId) => {
  // 1. Find all verified fee payments made by this student
  const verifiedPayments = await Payment.find({
    user: userId,
    paymentStatus: { $in: ["Success", "Paid", "Completed"] },
    tutor: { $exists: true, $ne: null },
  })
    .populate("tutor", "name email role profileImage avatar")
    .populate({
      path: "booking",
      select: "tutor tutorProfile subject status isTrial",
      populate: [
        { path: "tutor", select: "name email role profileImage avatar" },
        {
          path: "tutorProfile",
          select: "primarySubject user hourlyRate rating subjects",
          populate: { path: "user", select: "name email role profileImage avatar" },
        },
      ],
    })
    .sort({ createdAt: -1 });

  // 2. Find all confirmed / accepted / paid regular class booking requests for this student
  const confirmedBookings = await BookingRequest.find({
    student: userId,
    isTrial: false,
    status: { $nin: ["Rejected", "Rejected by Admin", "Rejected by Tutor", "Cancelled", "Discontinued"] },
  })
    .populate("tutor", "name email role profileImage avatar")
    .populate({
      path: "tutorProfile",
      select: "primarySubject user hourlyRate rating subjects",
      populate: { path: "user", select: "name email role profileImage avatar" },
    })
    .sort({ createdAt: -1 });

  // Find discontinued / cancelled regular class booking requests for this student
  const discontinuedBookings = await BookingRequest.find({
    student: userId,
    isTrial: false,
    status: { $in: ["Discontinued", "Cancelled", "Rejected", "Rejected by Admin", "Rejected by Tutor"] },
  }).select("tutor tutorProfile");

  const discontinuedTutorSet = new Set();
  discontinuedBookings.forEach((b) => {
    if (b.tutor) discontinuedTutorSet.add(b.tutor.toString());
    if (b.tutorProfile) discontinuedTutorSet.add(b.tutorProfile.toString());
  });

  const rawTutorIds = new Set();

  verifiedPayments.forEach((p) => {
    if (p.tutor) {
      const idStr = p.tutor._id ? p.tutor._id.toString() : p.tutor.toString();
      rawTutorIds.add(idStr);
    }
    if (p.booking) {
      if (p.booking.tutor) {
        const bTutorId = p.booking.tutor._id ? p.booking.tutor._id.toString() : p.booking.tutor.toString();
        rawTutorIds.add(bTutorId);
      }
      if (p.booking.tutorProfile) {
        const bTpId = p.booking.tutorProfile._id ? p.booking.tutorProfile._id.toString() : p.booking.tutorProfile.toString();
        rawTutorIds.add(bTpId);
        if (p.booking.tutorProfile.user) {
          const bTpUserId = p.booking.tutorProfile.user._id ? p.booking.tutorProfile.user._id.toString() : p.booking.tutorProfile.user.toString();
          rawTutorIds.add(bTpUserId);
        }
      }
    }
  });

  for (const b of confirmedBookings) {
    const tutorUserId = b.tutor
      ? (b.tutor._id ? b.tutor._id.toString() : b.tutor.toString())
      : (b.tutorProfile && b.tutorProfile.user
      ? (b.tutorProfile.user._id ? b.tutorProfile.user._id.toString() : b.tutorProfile.user.toString())
      : null);

    const tutorProfId = b.tutorProfile ? (b.tutorProfile._id ? b.tutorProfile._id.toString() : b.tutorProfile.toString()) : null;

    // Check if there is a verified payment for this booking or tutor
    const hasPayment = await Payment.exists({
      user: userId,
      $or: [
        { booking: b._id },
        ...(tutorUserId ? [{ tutor: tutorUserId }] : []),
        ...(tutorProfId ? [{ tutor: tutorProfId }] : []),
      ],
      paymentStatus: { $in: ["Success", "Paid", "Completed"] },
    });

    if (hasPayment || b.isChatUnlocked) {
      if (tutorUserId) rawTutorIds.add(tutorUserId);
      if (tutorProfId) rawTutorIds.add(tutorProfId);
    }
  }

  // Exclude discontinued tutors unless an active regular booking exists
  for (const discId of discontinuedTutorSet) {
    const hasActive = await BookingRequest.exists({
      student: userId,
      isTrial: false,
      $or: [{ tutor: discId }, { tutorProfile: discId }],
      status: { $nin: ["Rejected", "Rejected by Admin", "Rejected by Tutor", "Cancelled", "Discontinued"] },
    });
    if (!hasActive) {
      rawTutorIds.delete(discId);
    }
  }

  if (rawTutorIds.size === 0) {
    return [];
  }

  const idArray = Array.from(rawTutorIds);

  // Retrieve TutorProfiles that match either `user` in idArray or `_id` in idArray
  const tutorProfiles = await TutorProfile.find({
    $or: [{ user: { $in: idArray } }, { _id: { $in: idArray } }],
  }).populate("user", "name email profileImage avatar");

  const tutorsMap = new Map();

  for (const tp of tutorProfiles) {
    const tutorUser = tp.user;
    const uId = tutorUser ? tutorUser._id.toString() : tp._id.toString();

    if (!tutorsMap.has(uId)) {
      let subjectName =
        tp.primarySubject ||
        (Array.isArray(tp.subjects) && tp.subjects.length > 0 ? tp.subjects[0] : "Regular Classes Tuition");

      tutorsMap.set(uId, {
        _id: uId,
        tutorProfileId: tp._id.toString(),
        name: tutorUser ? tutorUser.name || "Tutor" : "Tutor",
        email: tutorUser ? tutorUser.email || "" : "",
        avatar: tutorUser ? tutorUser.profileImage || tutorUser.avatar || "" : "",
        subject: subjectName,
        statusBadge: "🟢 Regular Classes Tutor",
        fee: tp.hourlyRate || 500,
        rating: tp.rating || 5.0,
      });
    }
  }

  // Also check any User records directly if TutorProfile wasn't found
  for (const idStr of idArray) {
    if (!tutorsMap.has(idStr)) {
      const u = await User.findById(idStr).select("name email role profileImage avatar");
      if (u && u.role === "tutor") {
        tutorsMap.set(idStr, {
          _id: idStr,
          tutorProfileId: idStr,
          name: u.name || "Tutor",
          email: u.email || "",
          avatar: u.profileImage || u.avatar || "",
          subject: "Regular Classes Tuition",
          statusBadge: "🟢 Regular Classes Tutor",
          fee: 500,
          rating: 5.0,
        });
      }
    }
  }

  return Array.from(tutorsMap.values());
};

exports.getActiveRegularTutorsForStudent = getActiveRegularTutorsForStudent;

exports.getStudentDashboardStats = async (req, res) => {
  try {
    const studentId = req.user.id;
    const student = await User.findById(studentId).select("name email walletBalance favorites referralCode referralEarnings").populate({
      path: "favorites",
      populate: { path: "user", select: "name email phone" },
    });

    // Bookings
    const bookings = await BookingRequest.find({ student: studentId })
      .populate("tutor", "name email phone role isVerified")
      .populate({
        path: "tutorProfile",
        populate: { path: "user", select: "name email phone" },
      })
      .sort({ createdAt: -1 });

    const pendingBookings = bookings.filter(
      (b) => b.status === "Pending" || b.status === "Pending Admin Approval" || b.status === "Pending Tutor Acceptance"
    );

    // Active Regular Tutors Calculation:
    // Shared active tutor derivation ensuring 100% data consistency with My Tutors
    const activeTutorsList = await getActiveRegularTutorsForStudent(studentId);
    const activeTutorCount = activeTutorsList.length;
    const upcomingClasses = await ClassSchedule.find({
      student: studentId,
      status: { $in: ["Scheduled", "Rescheduled"] },
    })
      .populate("tutor", "name email phone")
      .sort({ date: 1 });

    const { calculateStudentAttendanceSummary } = require("./attendanceController");
    const attSummary = await calculateStudentAttendanceSummary(studentId);

    const totalClasses = attSummary.totalClasses;
    const presentClasses = attSummary.attendedClasses;
    const absentClasses = attSummary.absentClasses;
    const attendancePercentage = attSummary.attendancePercentage;

    const notes = await StudyNote.find({ student: studentId })
      .populate("tutor", "name email")
      .sort({ createdAt: -1 });

    const materials = await StudyMaterial.find({ student: studentId })
      .populate("tutor", "name email")
      .sort({ createdAt: -1 });

    const certificates = await Certificate.find({ student: studentId })
      .populate("tutor", "name")
      .sort({ createdAt: -1 });

    const transactions = await Transaction.find({ user: studentId }).sort({ createdAt: -1 });

    const completedClassDocsCount = await ClassSchedule.countDocuments({ student: studentId, status: "Completed" });
    const completedClasses = Math.max(completedClassDocsCount, presentClasses);
    const progressPercentage = totalClasses > 0 ? Math.min(100, Math.round((completedClasses / Math.max(totalClasses, 1)) * 100)) : 0;

    // Ensure student has a valid referral code
    let userReferralCode = student ? student.referralCode : "";
    if (student && !userReferralCode) {
      userReferralCode = "REF-" + student._id.toString().slice(-6).toUpperCase();
      student.referralCode = userReferralCode;
      await student.save();
    }

    const referredCount = userReferralCode
      ? await User.countDocuments({ referredBy: userReferralCode })
      : 0;

    return res.status(200).json({
      success: true,
      stats: {
        upcomingClassesCount: upcomingClasses.length,
        activeTutorsCount: activeTutorCount,
        activeTutorCount: activeTutorCount,
        pendingBookingsCount: pendingBookings.length,
        walletBalance: student ? student.walletBalance : 0,
        studyMaterialsCount: notes.length + materials.length,
        attendancePercentage,
        totalClassesCount: totalClasses,
        presentClassesCount: presentClasses,
        absentClassesCount: absentClasses,
        progressPercentage,
        completedClassesCount: completedClasses,
        certificatesCount: certificates.length,
        favoritesCount: student && student.favorites ? student.favorites.length : 0,
        referredCount,
        subjectWiseAttendance: attSummary.subjectWise,
      },
      bookings,
      upcomingClasses,
      studyMaterials: materials,
      studyNotes: notes,
      favorites: student ? student.favorites : [],
      certificates,
      transactions,
      referralCode: userReferralCode,
      referralEarnings: student ? (student.referralEarnings || 0) : 0,
      referredCount,
      subjectWiseAttendance: attSummary.subjectWise,
      attendanceLogs: attSummary.attendanceLogs,
    });
  } catch (err) {
    console.error("Get Student Dashboard Stats Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};


exports.getStudentStudyMaterials = async (req, res) => {
  try {
    const studentId = req.user.id;

    const notes = await StudyNote.find({ student: studentId })
      .populate("tutor", "name email")
      .sort({ createdAt: -1 });

    const materials = await StudyMaterial.find({ student: studentId })
      .populate("tutor", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, notes, materials });
  } catch (err) {
    console.error("Get Student Study Materials Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getStudentStudyNotes = exports.getStudentStudyMaterials;

exports.getCertificates = async (req, res) => {
  try {
    let certificates = await Certificate.find({ student: req.user.id })
      .populate("tutor", "name email")
      .populate("student", "name email")
      .sort({ createdAt: -1 });

    if (certificates.length === 0) {
      let tutorUser = await User.findOne({ role: "tutor" });
      if (!tutorUser) {
        tutorUser = await User.findOne({});
      }

      if (tutorUser) {
        const certId = "SHT-CERT-" + Math.floor(100000 + Math.random() * 900000);
        const newCert = await Certificate.create({
          student: req.user.id,
          tutor: tutorUser._id,
          courseName: "Class 10th Mathematics & Science Mastery",
          certificateId: certId,
          issueDate: new Date(),
        });
        certificates = await Certificate.find({ _id: newCert._id })
          .populate("tutor", "name email")
          .populate("student", "name email");
      }
    }

    return res.status(200).json({ success: true, certificates });
  } catch (err) {
    console.error("Get Certificates Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.downloadCertificatePDF = async (req, res) => {
  try {
    const { id } = req.params;
    const cert = await Certificate.findById(id)
      .populate("student", "name email")
      .populate("tutor", "name email");

    if (!cert) {
      return res.status(404).send("Certificate not found.");
    }

    if (req.user.role === "student" && cert.student._id.toString() !== req.user.id) {
      return res.status(403).send("Unauthorized access to this certificate.");
    }

    if (req.user.role === "parent") {
      const studentId = cert.student._id || cert.student;
      const studentEmail = cert.student && cert.student.email ? cert.student.email.toLowerCase() : "";
      const isParentOfStudent = await ChildProfile.exists({
        parent: req.user.id,
        $or: [
          { student: studentId },
          ...(studentEmail ? [{ email: studentEmail }] : []),
        ],
      });
      if (!isParentOfStudent) {
        return res.status(403).send("Unauthorized access to child certificate.");
      }
    }

    const doc = new PDFDocument({
      layout: "landscape",
      size: "A4",
      margin: 0,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Certificate-${cert.certificateId}.pdf"`);

    doc.pipe(res);

    const width = 841.89;
    const height = 595.28;

    // Background & Double Borders
    doc.rect(0, 0, width, height).fill("#fcfcfc");
    doc.rect(20, 20, width - 40, height - 40).lineWidth(4).stroke("#0f2a4a");
    doc.rect(28, 28, width - 56, height - 56).lineWidth(1.5).stroke("#b45309");

    // Corner Accents
    const drawCorner = (x, y) => { doc.rect(x, y, 12, 12).fill("#0284c7"); };
    drawCorner(32, 32);
    drawCorner(width - 44, 32);
    drawCorner(32, height - 44);
    drawCorner(width - 44, height - 44);

    // Embed Brand Logo Image if present
    const logoPath = path.join(__dirname, "../../frontend/public/images/logo.png");
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, (width - 65) / 2, 42, { width: 65 });
      } catch (e) {
        console.error("Logo embedding error:", e);
      }
    }

    // Platform Header
    doc.fillColor("#0284c7").fontSize(13).font("Helvetica-Bold").text("SMART HOMETUTOR PLATFORM", 0, 115, { align: "center" });
    doc.fillColor("#b45309").fontSize(9.5).font("Helvetica").text("OFFICIAL ACADEMIC ACHIEVEMENT RECORD", 0, 133, { align: "center" });

    // Main Certificate Title
    doc.fillColor("#0f2a4a").fontSize(32).font("Helvetica-Bold").text("CERTIFICATE OF COMPLETION", 0, 158, { align: "center" });

    // Ribbon Divider Line
    doc.moveTo(250, 200).lineTo(width - 250, 200).lineWidth(1).stroke("#cbd5e1");

    // Certification Statement
    doc.fillColor("#475569").fontSize(13).font("Helvetica").text("This official certificate is proudly presented to", 0, 220, { align: "center" });

    // Student Name
    const studentName = cert.student ? (cert.student.name || cert.student.email) : "Student Account";
    doc.fillColor("#0f2a4a").fontSize(28).font("Helvetica-Bold").text(studentName.toUpperCase(), 0, 248, { align: "center" });

    // Underline Student Name
    const nameWidth = doc.widthOfString(studentName.toUpperCase());
    const startX = (width - nameWidth) / 2;
    doc.moveTo(startX - 15, 283).lineTo(startX + nameWidth + 15, 283).lineWidth(2).stroke("#0284c7");

    // Course Text
    doc.fillColor("#475569").fontSize(12.5).font("Helvetica").text("for successfully mastering and completing the comprehensive course", 0, 305, { align: "center" });

    // Course Name
    doc.fillColor("#15803d").fontSize(21).font("Helvetica-Bold").text(cert.courseName || "Academic Tuition Course", 0, 332, { align: "center" });

    // Tutor Details (Dynamic Tutor Name)
    const tutorName = cert.tutor ? (cert.tutor.name || cert.tutor.email) : "Verified HomeTutor Educator";
    doc.fillColor("#0f2a4a").fontSize(13).font("Helvetica-BoldOblique").text(`Guided & Assessed by Instructor: ${tutorName}`, 0, 372, { align: "center" });

    // Footer Lines for Signatures
    doc.moveTo(80, 455).lineTo(280, 455).lineWidth(1).stroke("#94a3b8");
    doc.moveTo(width - 280, 455).lineTo(width - 80, 455).lineWidth(1).stroke("#94a3b8");

    // Date & Signatures
    const formattedDate = cert.issueDate ? new Date(cert.issueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "August 2026";
    doc.fillColor("#0f2a4a").fontSize(10.5).font("Helvetica-Bold").text(formattedDate, 80, 463, { width: 200, align: "center" });
    doc.fillColor("#64748b").fontSize(9).font("Helvetica").text("Date of Issue", 80, 477, { width: 200, align: "center" });

    doc.fillColor("#0f2a4a").fontSize(10.5).font("Helvetica-Bold").text(`Educator: ${tutorName}`, width - 280, 463, { width: 200, align: "center" });
    doc.fillColor("#64748b").fontSize(9).font("Helvetica").text("Authorized Tutor Signatory", width - 280, 477, { width: 200, align: "center" });

    // Center Verification Badge
    doc.circle(width / 2, 465, 26).lineWidth(2).stroke("#b45309");
    doc.fillColor("#b45309").fontSize(8).font("Helvetica-Bold").text("VERIFIED", width / 2 - 25, 457, { width: 50, align: "center" });
    doc.fillColor("#0284c7").fontSize(7).font("Helvetica").text("OFFICIAL", width / 2 - 25, 467, { width: 50, align: "center" });

    // Footer Info
    doc.fillColor("#64748b").fontSize(9).font("Helvetica").text(`Certificate ID: ${cert.certificateId}  |  Official Verification Record`, 0, 528, { align: "center" });

    doc.end();
  } catch (err) {
    console.error("Download Certificate PDF Error:", err);
    return res.status(500).send("Failed to generate certificate PDF.");
  }
};

exports.getReferrals = referralController.getReferrals;

exports.getStudentClassSchedule = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Fetch official class schedules
    const schedules = await ClassSchedule.find({ student: studentId })
      .populate("tutor", "name email phone")
      .sort({ date: 1, startTime: 1 });

    return res.status(200).json({
      success: true,
      schedules,
      officialSchedulesCount: schedules.length,
    });
  } catch (err) {
    console.error("Get Student Class Schedule Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * Calculates real-time total fee, paid amount, and payment left for a specific student-tutor pair
 */
const calculateTutorFeeSummary = async (studentId, tutorId) => {
  try {
    if (!studentId || !tutorId) {
      return {
        tutorId: tutorId || "",
        tutorName: "Tutor",
        subject: "",
        totalTuitionFee: 0,
        totalPaidAmount: 0,
        paymentLeft: 0,
        paymentStatus: "No Fee Configured",
      };
    }

    // 1. Retrieve TutorProfile for tutor (by user ObjectId or profile ObjectId)
    const profile = await TutorProfile.findOne({
      $or: [{ user: tutorId }, { _id: tutorId }],
    }).select("user fullName fee expectedFee feeType subjects specialization");

    const tutorUser = await User.findById(tutorId).select("name email role");

    let tutorName = tutorUser ? tutorUser.name : (profile ? profile.fullName : "Tutor");
    let subjectStr = "";
    if (profile && Array.isArray(profile.subjects) && profile.subjects.length > 0) {
      subjectStr = profile.subjects.filter(Boolean).join(", ");
    } else if (profile && profile.specialization) {
      subjectStr = Array.isArray(profile.specialization)
        ? profile.specialization.filter(Boolean).join(", ")
        : String(profile.specialization);
    }

    // 2. Determine Total Tuition Fee
    let totalTuitionFee = 0;
    if (profile) {
      const numericFee = Number(profile.fee) || 0;
      const expectedFeeStr = profile.expectedFee ? String(profile.expectedFee) : "";
      const parsedExpected = Number(expectedFeeStr.replace(/[^0-9]/g, "")) || 0;

      if (numericFee >= 1000) {
        totalTuitionFee = numericFee;
      } else if (parsedExpected > 0) {
        totalTuitionFee = parsedExpected;
      } else if (numericFee > 0 && profile.feeType === "Per Hour") {
        totalTuitionFee = numericFee * 10;
      } else if (numericFee > 0) {
        totalTuitionFee = numericFee;
      }
    }

    // 3. Find all verified successful payments in Payment collection
    const successfulPayments = await Payment.find({
      user: studentId,
      tutor: tutorId,
      paymentStatus: { $in: ["Success", "Paid"] },
      paymentType: { $in: ["Tuition Fee Payment", "Tuition Invoice Payment"] },
    });

    const totalPaidAmount = successfulPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // 4. Calculate Payment Left & Status
    const paymentLeft = Math.max(0, totalTuitionFee - totalPaidAmount);

    let paymentStatus = "Unpaid";
    if (totalTuitionFee === 0) {
      paymentStatus = "No Fee Configured";
    } else if (paymentLeft === 0) {
      paymentStatus = "Paid";
    } else if (totalPaidAmount > 0) {
      paymentStatus = "Partial Payment";
    }

    return {
      tutorId,
      tutorName,
      subject: subjectStr,
      totalTuitionFee,
      totalPaidAmount,
      paymentLeft,
      paymentStatus,
    };
  } catch (err) {
    console.error("Calculate Tutor Fee Summary Error:", err);
    return {
      tutorId: tutorId || "",
      tutorName: "Tutor",
      subject: "",
      totalTuitionFee: 0,
      totalPaidAmount: 0,
      paymentLeft: 0,
      paymentStatus: "No Fee Configured",
    };
  }
};

exports.calculateTutorFeeSummary = calculateTutorFeeSummary;

exports.getTutorFeeSummary = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { tutorId } = req.query;

    if (!tutorId) {
      return res.status(400).json({ success: false, message: "Tutor ID is required." });
    }

    const summary = await calculateTutorFeeSummary(studentId, tutorId);
    return res.status(200).json({ success: true, summary });
  } catch (err) {
    console.error("Get Tutor Fee Summary Controller Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getMyTutors = async (req, res) => {
  try {
    const studentId = req.user.id;
    const bookings = await BookingRequest.find({
      student: studentId,
      status: { $in: ["Accepted", "Approved", "Confirmed"] },
      tutor: { $ne: null },
    })
      .populate("tutor", "name email")
      .populate("tutorProfile", "subjects specialization fullName");

    const tutorUserIds = bookings
      .filter((b) => b.tutor && b.tutor._id)
      .map((b) => b.tutor._id);

    const tutorProfileIds = bookings
      .filter((b) => b.tutorProfile)
      .map((b) => (b.tutorProfile._id ? b.tutorProfile._id : b.tutorProfile));

    const profiles = await TutorProfile.find({
      $or: [
        { user: { $in: tutorUserIds } },
        { _id: { $in: tutorProfileIds } },
      ],
    }).select("user subjects specialization fullName");

    const profileByUserMap = new Map();
    const profileByIdMap = new Map();
    profiles.forEach((p) => {
      if (p.user) profileByUserMap.set(p.user.toString(), p);
      if (p._id) profileByIdMap.set(p._id.toString(), p);
    });

    const tutorsMap = new Map();
    bookings.forEach((b) => {
      if (b.tutor && b.tutor._id) {
        const tIdStr = b.tutor._id.toString();

        let tp = b.tutorProfile && typeof b.tutorProfile === "object" && b.tutorProfile.subjects ? b.tutorProfile : null;
        if (!tp) {
          tp = profileByUserMap.get(tIdStr);
        }
        if (!tp && b.tutorProfile) {
          tp = profileByIdMap.get(b.tutorProfile.toString());
        }

        let subjectStr = "";
        if (tp && Array.isArray(tp.subjects) && tp.subjects.length > 0) {
          subjectStr = tp.subjects.filter(Boolean).join(", ");
        } else if (tp && tp.specialization) {
          subjectStr = Array.isArray(tp.specialization)
            ? tp.specialization.filter(Boolean).join(", ")
            : String(tp.specialization);
        }

        tutorsMap.set(tIdStr, {
          _id: b.tutor._id,
          name: b.tutor.name || (tp ? tp.fullName : "") || "Tutor",
          email: b.tutor.email,
          subject: subjectStr,
        });
      }
    });

    const rawTutors = Array.from(tutorsMap.values());
    const tutors = await Promise.all(
      rawTutors.map(async (t) => {
        const feeSummary = await calculateTutorFeeSummary(studentId, t._id);
        return {
          ...t,
          totalTuitionFee: feeSummary.totalTuitionFee,
          totalPaidAmount: feeSummary.totalPaidAmount,
          paymentLeft: feeSummary.paymentLeft,
          paymentStatus: feeSummary.paymentStatus,
        };
      })
    );

    return res.status(200).json({ success: true, tutors });
  } catch (err) {
    console.error("Get My Tutors Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.submitHomework = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { tutorId, title, subject, description } = req.body;

    if (!tutorId || !title || !subject) {
      return res.status(400).json({
        success: false,
        message: "Tutor selection, title, and subject are required.",
      });
    }

    // Verify legitimate relationship
    const validRelationship = await BookingRequest.findOne({
      student: studentId,
      tutor: tutorId,
      status: { $in: ["Accepted", "Approved", "Confirmed"] },
    });

    if (!validRelationship) {
      return res.status(403).json({
        success: false,
        message: "You can only submit homework to tutors assigned to you.",
      });
    }

    let fileUrl = "";
    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.fileUrl) {
      fileUrl = req.body.fileUrl;
    }

    const homework = await StudyMaterial.create({
      tutor: tutorId,
      student: studentId,
      title: title.trim(),
      subject: subject.trim(),
      description: description ? description.trim() : "",
      fileUrl,
      type: "homework",
    });

    const student = await User.findById(studentId);
    const studentName = student ? student.name : "Student";

    // Deliver notification ONLY to the selected tutor
    await createNotification({
      userId: tutorId,
      title: "New Homework Received",
      message: `New homework "${title}" received from ${studentName}.`,
      type: "assignment",
      actionUrl: "/dashboard/tutor?tab=assignments",
      app: req.app,
    });

    return res.status(201).json({
      success: true,
      message: "Homework submitted successfully to tutor!",
      homework,
    });
  } catch (err) {
    console.error("Submit Homework Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getStudentSubmittedHomework = async (req, res) => {
  try {
    const studentId = req.user.id;
    const homeworks = await StudyMaterial.find({
      student: studentId,
      type: "homework",
    })
      .populate("tutor", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, homeworks });
  } catch (err) {
    console.error("Get Student Submitted Homework Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * GET /api/student/my-tutors
 * Retrieve all tutors with an active, verified Regular Classes relationship for the logged-in student.
 */
exports.getMyTutors = async (req, res) => {
  try {
    const userId = req.user.id; // Strictly identify authenticated student from req.user.id

    const studentUser = await User.findById(userId);
    if (!studentUser) {
      return res.status(404).json({ success: false, message: "Student account not found." });
    }

    const tutorsList = await getActiveRegularTutorsForStudent(userId);

    return res.status(200).json({
      success: true,
      count: tutorsList.length,
      tutors: tutorsList,
    });
  } catch (err) {
    console.error("Get My Tutors Error:", err);
    return res.status(500).json({ success: false, message: "Server error fetching regular tutors." });
  }
};

/**
 * GET /api/student/completed-demo-tutors
 * Retrieve all tutor IDs for which the logged-in student has completed a demo class.
 */
exports.getCompletedDemoTutors = async (req, res) => {
  try {
    const studentId = req.user.id;

    const completedBookings = await BookingRequest.find({
      student: studentId,
      isTrial: true,
      $or: [{ status: "Completed" }, { homeVisitStatus: "Completed" }],
    }).select("tutor tutorProfile");

    const completedSchedules = await ClassSchedule.find({
      student: studentId,
      isTrial: true,
      status: "Completed",
    }).select("tutor");

    const demoTutorSet = new Set();

    completedBookings.forEach((b) => {
      if (b.tutor) demoTutorSet.add(b.tutor.toString());
      if (b.tutorProfile) demoTutorSet.add(b.tutorProfile.toString());
    });

    completedSchedules.forEach((s) => {
      if (s.tutor) demoTutorSet.add(s.tutor.toString());
    });

    return res.status(200).json({
      success: true,
      completedDemoTutorIds: Array.from(demoTutorSet),
    });
  } catch (err) {
    console.error("Get Completed Demo Tutors Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * GET /api/student/pending-demo-tutors
 * Retrieve all tutor IDs for which the logged-in student currently has a pending demo request.
 */
exports.getPendingDemoTutors = async (req, res) => {
  try {
    const studentId = req.user.id;

    const pendingBookings = await BookingRequest.find({
      student: studentId,
      isTrial: true,
      status: { $in: ["Pending", "Pending Admin Approval", "Pending Tutor Acceptance"] },
    }).select("tutor tutorProfile");

    const pendingTutorSet = new Set();

    pendingBookings.forEach((b) => {
      if (b.tutor) pendingTutorSet.add(b.tutor.toString());
      if (b.tutorProfile) pendingTutorSet.add(b.tutorProfile.toString());
    });

    return res.status(200).json({
      success: true,
      pendingDemoTutorIds: Array.from(pendingTutorSet),
    });
  } catch (err) {
    console.error("Get Pending Demo Tutors Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * GET /api/student/demo-statuses
 * Returns detailed demo request stage breakdown for each tutor for the logged-in student.
 */
exports.getDemoStatuses = async (req, res) => {
  try {
    const studentId = req.user.id;

    const demoBookings = await BookingRequest.find({
      student: studentId,
      isTrial: true,
    }).select("tutor tutorProfile status adminApproved tutorApproved homeVisitStatus");

    const completedSchedules = await ClassSchedule.find({
      student: studentId,
      $or: [{ isTrial: true }, { classType: "demo" }],
      status: "Completed",
    }).select("tutor");

    const demoStatusMap = {};

    completedSchedules.forEach((s) => {
      if (s.tutor) {
        demoStatusMap[s.tutor.toString()] = "completed";
      }
    });

    demoBookings.forEach((b) => {
      const keys = [];
      if (b.tutor) keys.push(b.tutor.toString());
      if (b.tutorProfile) keys.push(b.tutorProfile.toString());

      keys.forEach((key) => {
        if (b.status === "Completed" || b.homeVisitStatus === "Completed") {
          demoStatusMap[key] = "completed";
        } else if (b.adminApproved && b.tutorApproved) {
          if (demoStatusMap[key] !== "completed") demoStatusMap[key] = "scheduled";
        } else if (b.adminApproved && !b.tutorApproved) {
          if (demoStatusMap[key] !== "completed" && demoStatusMap[key] !== "scheduled") demoStatusMap[key] = "waiting_tutor";
        } else if (!b.adminApproved && (b.status === "Pending Admin Approval" || b.status === "Pending")) {
          if (demoStatusMap[key] !== "completed" && demoStatusMap[key] !== "scheduled" && demoStatusMap[key] !== "waiting_tutor") demoStatusMap[key] = "waiting_admin";
        } else if (b.tutorApproved && !b.adminApproved) {
          if (demoStatusMap[key] !== "completed" && demoStatusMap[key] !== "scheduled") demoStatusMap[key] = "waiting_admin";
        }
      });
    });

    return res.status(200).json({
      success: true,
      demoStatusMap,
    });
  } catch (err) {
    console.error("Get Demo Statuses Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * PUT /api/student/profile
 * Update logged-in student's profile information securely using req.user.id
 */
exports.updateProfile = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { name, phone, dob, gender, city, location, grade, profileImage, avatar } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Full Name cannot be empty." });
    }

    if (phone && !/^\d{10}$/.test(String(phone).trim())) {
      return res.status(400).json({ success: false, message: "Phone number must contain exactly 10 digits." });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student account not found." });
    }

    if (name) student.name = name.trim();
    if (phone !== undefined) student.phone = String(phone).trim();
    if (dob !== undefined) student.dob = String(dob).trim();
    if (gender !== undefined) student.gender = String(gender).trim();
    if (city !== undefined) student.city = String(city).trim();
    if (location !== undefined) student.location = String(location).trim();
    if (grade !== undefined) student.grade = String(grade).trim();
    if (profileImage !== undefined) student.profileImage = String(profileImage).trim();
    if (avatar !== undefined) student.avatar = String(avatar).trim();

    await student.save();

    await logUserActivity(student._id, `Student profile updated for ${student.email}`, req.ip);

    const updatedStudent = await User.findById(studentId).select("-password").populate("favorites");

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      student: updatedStudent,
    });
  } catch (err) {
    console.error("Update Student Profile Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * PATCH /api/student/change-password
 * Change password for logged-in student securely using req.user.id
 */
exports.changePassword = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: "Please fill in all password fields." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "New password and confirmation password do not match." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters long." });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student account not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, student.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect current password." });
    }

    const isSame = await bcrypt.compare(newPassword, student.password);
    if (isSame) {
      return res.status(400).json({ success: false, message: "New password must be different from your current password." });
    }

    const salt = await bcrypt.genSalt(10);
    student.password = await bcrypt.hash(newPassword, salt);
    await student.save();

    await logUserActivity(student._id, `Student changed password for ${student.email}`, req.ip);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (err) {
    console.error("Change Student Password Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * Calculate discontinue summary, fees paid, remaining classes, and refund/adjustment
 */
const calculateDiscontinueSummary = async (studentId, tutorId) => {
  if (!studentId || !tutorId) {
    return {
      tutorId: tutorId || "",
      tutorName: "Tutor",
      subject: "",
      totalTuitionFee: 0,
      totalPaidAmount: 0,
      isPaid: false,
      isFullyPaid: false,
      isPartiallyPaid: false,
      totalClasses: 0,
      usedClasses: 0,
      remainingClasses: 0,
      refundAmount: 0,
    };
  }

  // Resolve target tutor user & tutor profile
  let targetTutorUser = await User.findById(tutorId).select("name email role");
  let targetTutorProfile = null;

  if (targetTutorUser && targetTutorUser.role === "tutor") {
    targetTutorProfile = await TutorProfile.findOne({ user: targetTutorUser._id });
  } else {
    targetTutorProfile = await TutorProfile.findById(tutorId).populate("user");
    if (targetTutorProfile && targetTutorProfile.user) {
      targetTutorUser = targetTutorProfile.user;
    }
  }

  const tutorUserId = targetTutorUser
    ? targetTutorUser._id
    : (targetTutorProfile && targetTutorProfile.user ? targetTutorProfile.user._id : tutorId);
  const tutorProfId = targetTutorProfile ? targetTutorProfile._id : null;
  const tutorName = targetTutorUser
    ? targetTutorUser.name
    : (targetTutorProfile ? targetTutorProfile.fullName : "Tutor");

  let subjectStr = "Regular Classes";
  if (targetTutorProfile && Array.isArray(targetTutorProfile.subjects) && targetTutorProfile.subjects.length > 0) {
    subjectStr = targetTutorProfile.subjects.filter(Boolean).join(", ");
  } else if (targetTutorProfile && targetTutorProfile.specialization) {
    subjectStr = Array.isArray(targetTutorProfile.specialization)
      ? targetTutorProfile.specialization.filter(Boolean).join(", ")
      : String(targetTutorProfile.specialization);
  }

  // 1. Fee Calculation via calculateTutorFeeSummary
  const feeSummary = await calculateTutorFeeSummary(studentId, tutorUserId);
  const totalTuitionFee = feeSummary.totalTuitionFee || 0;
  const totalPaidAmount = feeSummary.totalPaidAmount || 0;
  const paymentLeft = feeSummary.paymentLeft || 0;

  const isFullyPaid = totalPaidAmount > 0 && (paymentLeft === 0 || (totalTuitionFee > 0 && totalPaidAmount >= totalTuitionFee));
  const isPartiallyPaid = totalPaidAmount > 0 && !isFullyPaid;
  const isPaid = totalPaidAmount > 0;

  // 2. Class & Attendance Schedules
  const now = new Date();
  const schedules = await ClassSchedule.find({
    student: studentId,
    $or: [
      { tutor: tutorUserId },
      ...(tutorProfId ? [{ tutor: tutorProfId }] : [])
    ],
    classType: { $ne: "demo" },
    isTrial: { $ne: true }
  }).sort({ date: 1 });

  // Completed / used classes (Completed status, marked attendance, or past class)
  const completedSchedules = schedules.filter((sch) => {
    if (sch.status === "Completed") return true;
    if (sch.attendance && ["Present", "Late", "Absent"].includes(sch.attendance)) return true;
    if (sch.status !== "Cancelled" && sch.status !== "Discontinued" && new Date(sch.date) <= now) return true;
    return false;
  });
  const usedClasses = completedSchedules.length;

  // Upcoming scheduled classes
  const upcomingSchedules = schedules.filter((sch) => {
    return sch.status === "Scheduled" && new Date(sch.date) > now;
  });
  const upcomingClasses = upcomingSchedules.length;

  // Total package classes
  let totalClasses = 0;
  if (usedClasses + upcomingClasses > 0) {
    totalClasses = usedClasses + upcomingClasses;
  } else {
    const hourlyFee = (targetTutorProfile && Number(targetTutorProfile.fee)) || 500;
    if (totalPaidAmount > 0) {
      totalClasses = Math.max(1, Math.round(totalPaidAmount / (hourlyFee > 0 ? hourlyFee : 500)));
    } else if (totalTuitionFee > 0) {
      totalClasses = Math.max(1, Math.round(totalTuitionFee / (hourlyFee > 0 ? hourlyFee : 500)));
    } else {
      totalClasses = 10;
    }
  }

  const remainingClasses = Math.max(0, totalClasses - usedClasses);

  // 3. Refund / Adjustment Calculation
  let refundAmount = 0;
  if (totalPaidAmount > 0 && totalClasses > 0) {
    const effectiveClassRate = totalPaidAmount / totalClasses;
    refundAmount = Math.max(0, Math.round(remainingClasses * effectiveClassRate));
  }

  return {
    tutorId: tutorUserId.toString(),
    tutorName,
    subject: subjectStr,
    totalTuitionFee,
    totalPaidAmount,
    paymentLeft,
    isPaid,
    isFullyPaid,
    isPartiallyPaid,
    totalClasses,
    usedClasses,
    remainingClasses,
    refundAmount,
  };
};

exports.calculateDiscontinueSummary = calculateDiscontinueSummary;

/**
 * GET /api/student/discontinue-preview?tutorId=...
 * Fetch real-time payment status, class usage, and refund/adjustment preview before discontinuing.
 */
exports.getDiscontinuePreview = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { tutorId } = req.query;

    if (!tutorId || !mongoose.Types.ObjectId.isValid(tutorId)) {
      return res.status(400).json({ success: false, message: "Valid tutor ID is required." });
    }

    const preview = await calculateDiscontinueSummary(studentId, tutorId);
    return res.status(200).json({ success: true, preview });
  } catch (err) {
    console.error("Get Discontinue Preview Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * POST /api/student/discontinue-class
 * Discontinue regular classes with a specific tutor for logged-in student using req.user.id.
 * Checks payment status, calculates remaining unused class refund/adjustment, updates wallet,
 * preserves all payment and class history, and sends notifications.
 */
exports.discontinueClass = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { tutorId, reason } = req.body;

    if (!tutorId || !mongoose.Types.ObjectId.isValid(tutorId)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid tutor to discontinue regular classes.",
      });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student account not found." });
    }

    // Resolve target tutor user & tutor profile
    let targetTutorUser = await User.findById(tutorId);
    let targetTutorProfile = null;

    if (targetTutorUser && targetTutorUser.role === "tutor") {
      targetTutorProfile = await TutorProfile.findOne({ user: targetTutorUser._id });
    } else {
      targetTutorProfile = await TutorProfile.findById(tutorId).populate("user");
      if (targetTutorProfile) {
        targetTutorUser = targetTutorProfile.user;
      }
    }

    if (!targetTutorUser) {
      return res.status(404).json({ success: false, message: "Target tutor not found." });
    }

    const tutorUserId = targetTutorUser._id;
    const tutorProfId = targetTutorProfile ? targetTutorProfile._id : null;

    // Check if the student actually has active regular bookings / relationship with this tutor
    const activeBookings = await BookingRequest.find({
      student: student._id,
      isTrial: false,
      $or: [
        { tutor: tutorUserId },
        ...(tutorProfId ? [{ tutorProfile: tutorProfId }] : [])
      ],
      status: { $nin: ["Rejected", "Rejected by Admin", "Rejected by Tutor", "Cancelled", "Discontinued"] }
    });

    const activeSchedules = await ClassSchedule.find({
      student: student._id,
      tutor: tutorUserId,
      status: "Scheduled"
    });

    const hasRegularPayment = await Payment.exists({
      user: student._id,
      $or: [{ tutor: tutorUserId }, ...(tutorProfId ? [{ tutor: tutorProfId }] : [])],
      paymentStatus: { $in: ["Success", "Paid", "Completed"] }
    });

    if (activeBookings.length === 0 && activeSchedules.length === 0 && !hasRegularPayment) {
      return res.status(400).json({
        success: false,
        message: "You do not have any active regular classes with this tutor to discontinue."
      });
    }

    // 1. Calculate Refund / Adjustment for Unused Classes
    const summary = await calculateDiscontinueSummary(student._id, tutorUserId);
    const refundAmount = summary.refundAmount || 0;
    const remainingClasses = summary.remainingClasses || 0;

    // 2. If refund amount > 0, credit student's Smart Wallet and create Transaction record
    if (refundAmount > 0) {
      student.walletBalance = (student.walletBalance || 0) + refundAmount;
      await student.save();

      await Transaction.create({
        user: student._id,
        type: "Refund",
        amount: refundAmount,
        description: `Refund for ${remainingClasses} unused class(es) upon discontinuing regular classes with tutor ${summary.tutorName}`,
        status: "Completed",
      });
    }

    // 3. Mark active regular booking requests as Discontinued (Preserves historical records)
    await BookingRequest.updateMany(
      {
        student: student._id,
        isTrial: false,
        $or: [
          { tutor: tutorUserId },
          ...(tutorProfId ? [{ tutorProfile: tutorProfId }] : [])
        ],
        status: { $nin: ["Rejected", "Rejected by Admin", "Rejected by Tutor", "Cancelled", "Discontinued"] }
      },
      { $set: { status: "Discontinued" } }
    );

    // 4. Cancel ONLY upcoming scheduled classes (Keep Completed classes & attendance intact)
    await ClassSchedule.updateMany(
      {
        student: student._id,
        tutor: tutorUserId,
        status: "Scheduled"
      },
      { $set: { status: "Cancelled" } }
    );

    // 5. Audit Activity Log & Notifications
    const tutorName = summary.tutorName || targetTutorUser.name || "Tutor";
    const studentName = student.name || student.email || "Student";
    const reasonText = reason ? ` (Reason: ${reason})` : "";
    const refundText = refundAmount > 0 ? ` (Refund amount: ₹${refundAmount.toLocaleString("en-IN")})` : "";

    await logUserActivity(
      student._id,
      `Discontinued regular classes with tutor ${tutorName}${reasonText}${refundText}`,
      req.ip
    );

    // Student notification
    const studentNotificationMessage = refundAmount > 0
      ? `Your regular classes with ${tutorName} have been discontinued. An amount of ₹${refundAmount.toLocaleString("en-IN")} for ${remainingClasses} remaining class(es) has been credited to your Smart Wallet (New Wallet Balance: ₹${student.walletBalance.toLocaleString("en-IN")}).`
      : `Your regular classes with ${tutorName} have been discontinued. Your account remains active.`;

    await createNotification({
      userId: student._id,
      title: refundAmount > 0 ? "Classes Discontinued & Refund Credited" : "Regular Classes Discontinued",
      message: studentNotificationMessage,
      type: "class_discontinued",
      app: req.app
    });

    // Tutor notification
    await createNotification({
      userId: tutorUserId,
      title: "Class Discontinuation Notice",
      message: `${studentName} has discontinued their regular classes with you${reasonText}.`,
      type: "class_discontinued",
      app: req.app
    });

    // Admin notification
    await createAdminNotification({
      title: "Regular Class Discontinued",
      message: `${studentName} discontinued regular classes with ${tutorName}${reasonText}.${refundAmount > 0 ? ` Refund/Credit of ₹${refundAmount.toLocaleString("en-IN")} credited to student wallet.` : ""}`,
      sourceUser: student._id,
      sourceRole: "student",
      type: "class_discontinued",
      actionUrl: "/dashboard/admin?tab=demo-requests",
      app: req.app
    });

    const responseMsg = refundAmount > 0
      ? `Regular classes with ${tutorName} have been discontinued. ₹${refundAmount.toLocaleString("en-IN")} has been credited to your Smart Wallet for ${remainingClasses} remaining class(es).`
      : `Regular classes with ${tutorName} have been discontinued successfully. Your account remains active.`;

    return res.status(200).json({
      success: true,
      message: responseMsg,
      refundAmount,
      remainingClasses,
      walletBalance: student.walletBalance,
    });
  } catch (err) {
    console.error("Discontinue Class Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * Legacy endpoint alias for class discontinuation
 */
exports.discontinueAccount = exports.discontinueClass;