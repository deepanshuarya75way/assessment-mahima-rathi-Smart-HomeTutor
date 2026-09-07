/**
 * ==========================================
 * REFERRAL MODEL
 * ==========================================
 * MongoDB schema for tracking user referral relationships,
 * referred roles, signup dates, first payment details, and reward statuses.
 */

const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referredUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    referredRole: {
      type: String,
      enum: ["student", "tutor", "parent", "other"],
      required: true,
      default: "student",
    },
    referralCode: {
      type: String,
      required: true,
      trim: true,
    },
    signupDate: {
      type: Date,
      default: Date.now,
    },
    firstPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    firstPaymentAmount: {
      type: Number,
      default: 0,
    },
    rewardAmount: {
      type: Number,
      default: 0,
    },
    rewardStatus: {
      type: String,
      enum: ["Pending", "Rewarded"],
      default: "Pending",
      index: true,
    },
    rewardedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

referralSchema.index({ referrer: 1, rewardStatus: 1 });
referralSchema.index({ referrer: 1, referredRole: 1 });

module.exports = mongoose.model("Referral", referralSchema);
