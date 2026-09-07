/**
 * ==========================================
 * REFERRAL CONTROLLER
 * ==========================================
 * Shared referral program controller for all user roles
 * (Students, Tutors, Parents, Admins).
 * Enforces strict user-level data isolation using req.user.id.
 */

const User = require("../models/User");
const Referral = require("../models/Referral");

exports.getReferrals = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("referralCode referralEarnings name email role");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    let code = user.referralCode;
    if (!code) {
      code = "REF-" + user._id.toString().slice(-6).toUpperCase();
      user.referralCode = code;
      await user.save();
    }

    // 1. Sync legacy referred users into Referral collection if not present
    const legacyReferredUsers = await User.find({ referredBy: code }).select("name email createdAt role referralRewardStatus");
    for (const refUser of legacyReferredUsers) {
      await Referral.findOneAndUpdate(
        { referredUser: refUser._id },
        {
          $setOnInsert: {
            referrer: user._id,
            referredUser: refUser._id,
            referredRole: (refUser.role || "student").toLowerCase(),
            referralCode: code,
            signupDate: refUser.createdAt || new Date(),
            rewardStatus: refUser.referralRewardStatus === "Rewarded" ? "Rewarded" : "Pending",
            rewardAmount: refUser.referralRewardStatus === "Rewarded" ? (refUser.role === "tutor" ? 100 : 50) : 0,
          },
        },
        { upsert: true, new: true }
      ).catch(() => {});
    }

    // 2. Fetch all referrals for this referrer
    const referralsList = await Referral.find({ referrer: user._id })
      .populate("referredUser", "name email role createdAt referralRewardStatus")
      .sort({ createdAt: -1 })
      .lean();

    let studentReferrals = 0;
    let tutorReferrals = 0;
    let computedTotalEarnings = 0;

    const formattedReferrals = referralsList.map((r) => {
      const refUser = r.referredUser || {};
      const rawRole = (r.referredRole || refUser.role || "student").toLowerCase();
      const displayRole = rawRole === "tutor" ? "Tutor" : rawRole === "parent" ? "Parent" : "Student";

      if (rawRole === "tutor") {
        tutorReferrals += 1;
      } else {
        studentReferrals += 1;
      }

      const isRewarded = r.rewardStatus === "Rewarded";
      const rewardAmt = isRewarded ? (r.rewardAmount || (rawRole === "tutor" ? 100 : 50)) : 0;
      if (isRewarded) {
        computedTotalEarnings += rewardAmt;
      }

      return {
        id: r._id,
        _id: r._id,
        name: refUser.name || "Referred User",
        email: refUser.email || "",
        role: displayRole,
        referredRole: rawRole,
        joinedAt: r.signupDate || refUser.createdAt || r.createdAt,
        createdAt: r.signupDate || refUser.createdAt || r.createdAt,
        firstPaymentAmount: r.firstPaymentAmount || 0,
        rewardAmount: rewardAmt,
        rewardStatus: r.rewardStatus || "Pending",
        rewardedAt: r.rewardedAt || null,
        statusReason: isRewarded
          ? "Completed qualifying first payment"
          : "Waiting for first successful payment",
      };
    });

    const protocol = req.protocol || "http";
    const host = req.get("host") || "localhost:5173";
    const referralLink = `${protocol}://${host}/signup?ref=${code}`;

    const totalReferrals = formattedReferrals.length;
    const finalEarnings = Math.max(user.referralEarnings || 0, computedTotalEarnings);

    return res.status(200).json({
      success: true,
      referralCode: code,
      referralLink: referralLink,
      totalReferrals,
      studentReferrals,
      tutorReferrals,
      totalEarnings: finalEarnings,
      referralEarnings: finalEarnings,
      referrals: formattedReferrals,
      referredUsers: formattedReferrals,
    });
  } catch (err) {
    console.error("Get Referrals Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
