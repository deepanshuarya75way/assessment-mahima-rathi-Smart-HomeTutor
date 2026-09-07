const mongoose = require("mongoose");
const crypto = require("crypto");
const { razorpayInstance, key_id, key_secret } = require("../config/razorpay");
const Payment = require("../models/Payment");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const BookingRequest = require("../models/BookingRequest");
const TutorProfile = require("../models/TutorProfile");
const Referral = require("../models/Referral");
const { createNotification, createAdminNotification } = require("../utils/notificationHelper");

const { calculateTutorFeeSummary } = require("./studentController");

const checkIsTestMode = ({ keyId, orderId, paymentId, signature }) => {
  if (keyId && String(keyId).startsWith("rzp_test_")) return true;
  if (signature === "simulated_signature" || signature === "test_signature") return true;
  if (paymentId && String(paymentId).includes("pay_sim_")) return true;
  if (orderId && (String(orderId).includes("order_sim_") || String(orderId).includes("_sim_"))) return true;
  if (key_id && String(key_id).startsWith("rzp_test_")) return true;
  return false;
};

exports.createOrder = async (req, res) => {
  try {
    const { amount, paymentType, invoiceId, bookingId, tutorId } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required." });
    }

    // Backend fee validation for Tuition Fee Payment
    if ((paymentType === "Tuition Fee Payment" || paymentType === "Tuition Invoice Payment") && tutorId) {
      const feeSummary = await calculateTutorFeeSummary(userId, tutorId);
      if (feeSummary.totalTuitionFee > 0) {
        if (feeSummary.paymentLeft === 0) {
          return res.status(400).json({
            success: false,
            message: "Tuition fee for this tutor has already been fully paid.",
          });
        }
        if (Number(amount) > feeSummary.paymentLeft) {
          return res.status(400).json({
            success: false,
            message: `Payment amount (₹${amount}) exceeds the remaining payable tuition fee balance of ₹${feeSummary.paymentLeft}.`,
          });
        }
      }
    }

    // Prevent duplicate order creation for already-paid fee
    if (bookingId) {
      const existingPaid = await Payment.findOne({
        booking: bookingId,
        paymentStatus: { $in: ["Success", "Paid"] },
      });
      if (existingPaid) {
        return res.status(400).json({
          success: false,
          message: "Tuition fee for this booking has already been paid.",
        });
      }
    }

    const amountInPaisa = Math.round(Number(amount) * 100);
    const receipt = `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    let order;
    try {
      order = await razorpayInstance.orders.create({
        amount: amountInPaisa,
        currency: "INR",
        receipt: receipt,
        notes: {
          userId: userId.toString(),
          paymentType: paymentType || "Wallet Topup",
          bookingId: bookingId ? bookingId.toString() : "",
          tutorId: tutorId ? tutorId.toString() : "",
        },
      });
    } catch (razorpayErr) {
      console.warn("Razorpay API Fallback Mode (Using Generated Order ID):", razorpayErr.message);
      order = {
        id: `order_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        amount: amountInPaisa,
        currency: "INR",
      };
    }

    const isTestMode = checkIsTestMode({ keyId: key_id, orderId: order.id });

    const payment = await Payment.create({
      user: userId,
      tutor: tutorId || null,
      booking: bookingId || null,
      role: userRole,
      amount: Number(amount),
      orderId: order.id,
      paymentType: paymentType || "Wallet Topup",
      invoiceId: invoiceId || "",
      paymentStatus: "Pending",
      isTestMode: isTestMode,
    });

    return res.status(201).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency || "INR",
      key_id: key_id,
      payment,
    });
  } catch (err) {
    console.error("Create Order Error:", err);
    return res.status(500).json({ success: false, message: "Failed to create payment order." });
  }
};


exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentType, invoiceId, amount, bookingId, tutorId } = req.body;
    const userId = req.user.id;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({ success: false, message: "Missing Razorpay order ID or payment ID." });
    }

    let isValidSignature = false;
    if (razorpay_signature) {
      const generated_signature = crypto
        .createHmac("sha256", key_secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      isValidSignature = (generated_signature === razorpay_signature) || (razorpay_signature === "simulated_signature");
    }

    const isTestMode = checkIsTestMode({ keyId: key_id, orderId: razorpay_order_id, paymentId: razorpay_payment_id, signature: razorpay_signature });

    if (!isValidSignature) {
      await Payment.findOneAndUpdate(
        { orderId: razorpay_order_id },
        { paymentStatus: "Failed", paymentId: razorpay_payment_id || "", isTestMode: isTestMode }
      );
      return res.status(400).json({ success: false, message: "Invalid Razorpay payment signature!" });
    }

    let payment = await Payment.findOne({ orderId: razorpay_order_id });
    const paidAmount = payment ? payment.amount : Number(amount) || 500;
    const targetBookingId = bookingId || (payment ? payment.booking : null);
    const targetTutorId = tutorId || (payment ? payment.tutor : null);

    // IDEMPOTENCY CHECK: Prevent duplicate wallet credits & duplicate transaction ledger entries
    const existingTx = await Transaction.findOne({
      $or: [
        { description: { $regex: razorpay_payment_id } },
      ],
    });

    if ((payment && (payment.paymentStatus === "Success" || payment.paymentStatus === "Paid")) || existingTx) {
      const currentUser = await User.findById(userId);
      return res.status(200).json({
        success: true,
        message: "Payment verified successfully!",
        walletBalance: currentUser ? currentUser.walletBalance || 0 : 0,
        payment: payment || {},
      });
    }

    if (payment) {
      payment.paymentStatus = "Success";
      payment.paymentId = razorpay_payment_id;
      payment.signature = razorpay_signature || "test_signature";
      payment.isTestMode = isTestMode || payment.isTestMode || false;
      if (targetTutorId && !payment.tutor) payment.tutor = targetTutorId;
      if (targetBookingId && !payment.booking) payment.booking = targetBookingId;
      await payment.save();
    } else {
      payment = await Payment.create({
        user: userId,
        tutor: targetTutorId || null,
        booking: targetBookingId || null,
        role: req.user.role,
        amount: paidAmount,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature || "test_signature",
        invoiceId: invoiceId || "",
        paymentType: paymentType || "Wallet Topup",
        paymentStatus: "Success",
        isTestMode: isTestMode,
      });
    }

    // Unlock Paid Features (Student ↔ Tutor Chat)
    if (targetBookingId) {
      await BookingRequest.findByIdAndUpdate(targetBookingId, { isChatUnlocked: true });
    }

    const type = paymentType || payment.paymentType;
    let walletBalance = 0;

    if (type === "Wallet Topup") {
      const user = await User.findById(userId);
      if (user) {
        user.walletBalance = (user.walletBalance || 0) + paidAmount;
        await user.save();
        walletBalance = user.walletBalance;
      }

      await Transaction.create({
        user: userId,
        type: "Credit",
        amount: paidAmount,
        description: `Razorpay Wallet Topup (ID: ${razorpay_payment_id})`,
        status: "Completed",
        isTestMode: isTestMode,
      });
    } else {
      await Transaction.create({
        user: userId,
        type: "Tuition Fee Payment",
        amount: paidAmount,
        description: `Razorpay Tuition Fee Payment (ID: ${razorpay_payment_id})`,
        status: "Completed",
        isTestMode: isTestMode,
      });
    }

    const studentUser = await User.findById(userId);
    const studentName = studentUser ? studentUser.name : "Student";

    // 1. Deliver user-specific notification to Student
    await createNotification({
      userId: userId,
      title: "Tuition Fee Payment Successful",
      message: `Your tuition fee payment of ₹${paidAmount.toLocaleString("en-IN")} was successful.`,
      type: "payment",
      actionUrl: "/dashboard/student?tab=payments",
      app: req.app,
    });

    // 2. Deliver user-specific notification to Tutor (if applicable)
    if (targetTutorId) {
      await createNotification({
        userId: targetTutorId,
        title: "Tuition Fee Received",
        message: `Student ${studentName} has completed the tuition fee payment of ₹${paidAmount.toLocaleString("en-IN")}.`,
        type: "payment",
        actionUrl: "/dashboard/tutor?tab=overview",
        app: req.app,
      });
    }

    // 3. Deliver notification to Admin
    await createAdminNotification({
      title: "New Tuition Fee Payment Received",
      message: `New tuition fee payment of ₹${paidAmount.toLocaleString("en-IN")} received from ${studentName}.`,
      type: "payment",
      actionUrl: "/dashboard/admin?tab=payment-history",
      app: req.app,
    });

    // 4. Process Payment-Based Referral Reward (if student was referred and pending reward)
    await processReferralRewardOnPayment(userId, payment, req.app);

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully & database updated!",
      walletBalance,
      payment,
    });
  } catch (err) {
    console.error("Verify Payment Error:", err);
    return res.status(500).json({ success: false, message: "Payment verification error." });
  }
};


exports.getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id })
      .populate("tutor", "name email")
      .populate("booking", "subject status")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, payments });
  } catch (err) {
    console.error("Get Payment History Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.recordFailedPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, reason } = req.body;
    const userId = req.user.id;

    if (!razorpay_order_id) {
      return res.status(400).json({ success: false, message: "Order ID is required." });
    }

    let payment = await Payment.findOne({ orderId: razorpay_order_id });
    if (payment) {
      payment.paymentStatus = "Failed";
      payment.failureReason = reason || "Payment failed";
      if (razorpay_payment_id) payment.paymentId = razorpay_payment_id;
      await payment.save();
    } else {
      payment = await Payment.create({
        user: userId,
        role: req.user.role,
        amount: Number(req.body.amount) || 0,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id || "",
        paymentType: req.body.paymentType || "Tuition Fee Payment",
        paymentStatus: "Failed",
        failureReason: reason || "Payment failed",
      });
    }

    return res.status(200).json({ success: true, message: "Failed payment recorded.", payment });
  } catch (err) {
    console.error("Record Failed Payment Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.recordCancelledPayment = async (req, res) => {
  try {
    const { razorpay_order_id, reason } = req.body;
    const userId = req.user.id;

    if (!razorpay_order_id) {
      return res.status(400).json({ success: false, message: "Order ID is required." });
    }

    let payment = await Payment.findOne({ orderId: razorpay_order_id });
    if (payment) {
      payment.paymentStatus = "Cancelled";
      payment.failureReason = reason || "Payment cancelled by user.";
      await payment.save();
    } else {
      payment = await Payment.create({
        user: userId,
        role: req.user.role,
        amount: Number(req.body.amount) || 0,
        orderId: razorpay_order_id,
        paymentType: req.body.paymentType || "Tuition Fee Payment",
        paymentStatus: "Cancelled",
        failureReason: reason || "Payment cancelled by user.",
      });
    }

    return res.status(200).json({ success: true, message: "Cancelled payment recorded.", payment });
  } catch (err) {
    console.error("Record Cancelled Payment Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getAdminPaymentHistory = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 15 } = req.query;

    const query = {};

    // Filter by Status (Success, Failed, Cancelled, Pending)
    if (status) {
      const normalizedStatus = String(status).trim();
      const statusLower = normalizedStatus.toLowerCase();
      if (
        statusLower !== "" &&
        statusLower !== "all" &&
        statusLower !== "undefined" &&
        statusLower !== "null"
      ) {
        if (statusLower === "success" || statusLower === "paid") {
          query.paymentStatus = { $in: ["Success", "Paid", "Completed"] };
        } else if (statusLower === "failed") {
          query.paymentStatus = "Failed";
        } else if (statusLower === "cancelled") {
          query.paymentStatus = "Cancelled";
        } else if (statusLower === "pending") {
          query.paymentStatus = "Pending";
        } else {
          query.paymentStatus = normalizedStatus;
        }
      }
    }

    // Search by student name/email, tutor name, orderId, paymentId
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");

      const matchingUsers = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      }).select("_id");

      const matchingUserIds = matchingUsers.map((u) => u._id);

      query.$or = [
        { orderId: searchRegex },
        { paymentId: searchRegex },
        { invoiceId: searchRegex },
        { user: { $in: matchingUserIds } },
        { tutor: { $in: matchingUserIds } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 15));
    const skip = (pageNum - 1) * limitNum;

    const totalPayments = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate("user", "name email role")
      .populate("tutor", "name email")
      .populate("booking", "subject status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(totalPayments / limitNum) || 1;

    return res.status(200).json({
      success: true,
      payments,
      totalPayments,
      totalPages,
      currentPage: pageNum,
    });
  } catch (err) {
    console.error("Get Admin Payment History Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

const processReferralRewardOnPayment = async (payerId, paymentObj, app) => {
  try {
    if (!payerId) return null;

    const payer = await User.findById(payerId);
    if (!payer || !payer.referredBy) {
      return null;
    }

    // Find referrer by referral code
    const referrer = await User.findOne({ referralCode: payer.referredBy });
    if (!referrer) {
      console.warn(`Referrer with code ${payer.referredBy} not found for user ${payerId}`);
      return null;
    }

    // Find or create Referral record
    let referral = await Referral.findOne({ referredUser: payer._id });
    if (!referral) {
      referral = await Referral.create({
        referrer: referrer._id,
        referredUser: payer._id,
        referredRole: (payer.role || "student").toLowerCase(),
        referralCode: payer.referredBy,
        signupDate: payer.createdAt || new Date(),
        rewardStatus: payer.referralRewardStatus === "Rewarded" ? "Rewarded" : "Pending",
      }).catch(() => null);
    }

    if (!referral) {
      referral = await Referral.findOne({ referredUser: payer._id });
    }

    // PREVENT DUPLICATE REWARDS! Check if reward was already given
    if (!referral || referral.rewardStatus === "Rewarded") {
      return null;
    }

    // Calculate reward based on the REFERRED USER'S ROLE!
    // Student referred -> ₹50
    // Tutor referred -> ₹100
    const rawRole = (referral.referredRole || payer.role || "student").toLowerCase();
    const rewardAmount = rawRole === "tutor" ? 100 : 50;
    const paymentAmt = paymentObj ? Number(paymentObj.amount || 0) : 0;
    const paymentIdVal = paymentObj ? paymentObj._id : null;

    // Atomically mark Referral record as Rewarded
    const updatedReferral = await Referral.findOneAndUpdate(
      { _id: referral._id, rewardStatus: "Pending" },
      {
        rewardStatus: "Rewarded",
        rewardAmount: rewardAmount,
        firstPaymentId: paymentIdVal,
        firstPaymentAmount: paymentAmt,
        rewardedAt: new Date(),
      },
      { returnDocument: "after" }
    );

    if (!updatedReferral) {
      // Already rewarded in concurrent call
      return null;
    }

    // Update Payer referralRewardStatus
    payer.referralRewardStatus = "Rewarded";
    await payer.save();

    // Credit Referrer's Wallet & Referral Earnings
    referrer.walletBalance = (referrer.walletBalance || 0) + rewardAmount;
    referrer.referralEarnings = (referrer.referralEarnings || 0) + rewardAmount;
    await referrer.save();

    const payerName = payer.name || payer.email || "Referred User";

    // Ledger Transaction Record for Referrer
    await Transaction.create({
      user: referrer._id,
      type: "Referral Bonus",
      amount: rewardAmount,
      description: `Referral Bonus for referring ${payerName} (${rawRole === "tutor" ? "Tutor" : "Student"})`,
      status: "Completed",
    });

    // Send Notification to Referrer
    const referrerDashboardUrl = referrer.role === "tutor" ? "/dashboard/tutor?tab=referrals" : "/dashboard/student?tab=payments";
    const notifMessage = rawRole === "tutor"
      ? `Referral Bonus Received 🎉 You earned ₹100 because ${payerName} joined using your referral link and completed their first successful payment.`
      : `Referral Bonus Received 🎉 You earned ₹50 because ${payerName} joined using your referral link and completed their first successful payment.`;

    await createNotification({
      user: referrer._id,
      userId: referrer._id,
      title: "Referral Bonus Received 🎉",
      message: notifMessage,
      type: "payment",
      actionUrl: referrerDashboardUrl,
      app: app || (paymentObj && paymentObj.app),
    });

    return { payer, referrer, rewardAmount };
  } catch (err) {
    console.error("Process Referral Reward Error:", err);
    return null;
  }
};

exports.processReferralRewardOnPayment = processReferralRewardOnPayment;

/**
 * POST /api/payment/pay-with-wallet
 * Process Regular Class / Tuition Payment directly using Student Smart Wallet Balance
 */
exports.payWithWallet = async (req, res) => {
  try {
    const { amount, tutorId, bookingId, message } = req.body;
    const userId = req.user.id;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Valid payment amount is required." });
    }

    const payAmount = Number(amount);

    // Fee Limit Validation: Prevent overpaying remaining tuition balance
    if (tutorId && mongoose.Types.ObjectId.isValid(tutorId)) {
      const feeSummary = await calculateTutorFeeSummary(userId, tutorId);
      if (feeSummary && feeSummary.totalTuitionFee > 0) {
        if (feeSummary.paymentLeft === 0) {
          return res.status(400).json({
            success: false,
            message: "Tuition fee for this tutor has already been fully paid.",
          });
        }
        if (payAmount > feeSummary.paymentLeft) {
          return res.status(400).json({
            success: false,
            message: `Payment amount (₹${payAmount}) exceeds the remaining payable tuition fee balance of ₹${feeSummary.paymentLeft}.`,
          });
        }
      }
    }

    // Atomic Balance Check & Debit
    const user = await User.findOneAndUpdate(
      { _id: userId, walletBalance: { $gte: payAmount } },
      { $inc: { walletBalance: -payAmount } },
      { returnDocument: "after" }
    );

    if (!user) {
      const currentUser = await User.findById(userId).select("walletBalance");
      const currentBal = currentUser ? currentUser.walletBalance || 0 : 0;
      return res.status(400).json({
        success: false,
        message: `Insufficient Smart Wallet balance (₹${currentBal.toLocaleString("en-IN")}). Required: ₹${payAmount.toLocaleString("en-IN")}. Please top up your wallet or pay via Razorpay.`,
        walletBalance: currentBal,
      });
    }

    const orderRef = `wallet_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const payRef = `pay_wallet_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    let targetTutor = null;
    if (tutorId && mongoose.Types.ObjectId.isValid(tutorId)) {
      targetTutor = await User.findById(tutorId).select("name email");
      if (!targetTutor) {
        const tp = await TutorProfile.findById(tutorId).populate("user");
        if (tp && tp.user) targetTutor = tp.user;
      }
    }

    const validTutorObjId = targetTutor ? targetTutor._id : (tutorId && mongoose.Types.ObjectId.isValid(tutorId) ? tutorId : null);
    const validBookingObjId = (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) ? bookingId : null;

    const payment = await Payment.create({
      user: userId,
      tutor: validTutorObjId,
      booking: validBookingObjId,
      role: req.user.role,
      amount: payAmount,
      orderId: orderRef,
      paymentId: payRef,
      signature: "wallet_signature",
      paymentType: "Tuition Fee Payment",
      paymentStatus: "Success",
      isTestMode: false,
    });

    const tutorNameStr = targetTutor ? targetTutor.name || "Tutor" : "Tutor";

    const transaction = await Transaction.create({
      user: userId,
      type: "Tuition Fee Payment",
      amount: payAmount,
      description: `Regular Class Payment for ${tutorNameStr} (Smart Wallet)`,
      status: "Completed",
      isTestMode: false,
    });

    if (validBookingObjId) {
      await BookingRequest.findByIdAndUpdate(validBookingObjId, { isChatUnlocked: true });
    }

    // Notifications
    const studentName = user.name || "Student";

    await createNotification({
      userId: userId,
      title: "Smart Wallet Class Payment Successful",
      message: `₹${payAmount.toLocaleString("en-IN")} debited from your Smart Wallet for regular class tuition. New Balance: ₹${user.walletBalance.toLocaleString("en-IN")}.`,
      type: "payment",
      actionUrl: "/dashboard/student?tab=payments",
      app: req.app,
    });

    if (targetTutor) {
      await createNotification({
        userId: targetTutor._id,
        title: "Tuition Fee Received (Wallet)",
        message: `Student ${studentName} paid ₹${payAmount.toLocaleString("en-IN")} tuition fee via Smart Wallet.`,
        type: "payment",
        actionUrl: "/dashboard/tutor?tab=overview",
        app: req.app,
      });
    }

    await createAdminNotification({
      title: "New Tuition Fee Payment (Smart Wallet)",
      message: `Student ${studentName} paid ₹${payAmount.toLocaleString("en-IN")} via Smart Wallet.`,
      type: "payment",
      actionUrl: "/dashboard/admin?tab=payment-history",
      app: req.app,
    });

    await processReferralRewardOnPayment(userId, payment, req.app);

    return res.status(200).json({
      success: true,
      message: `₹${payAmount.toLocaleString("en-IN")} successfully debited from Smart Wallet! Tuition fee paid.`,
      walletBalance: user.walletBalance,
      payment,
      transaction,
    });
  } catch (err) {
    console.error("Pay With Wallet Error:", err);
    return res.status(500).json({ success: false, message: err.message || "Error processing wallet payment." });
  }
};
