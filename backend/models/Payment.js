/**
 * ==========================================
 * PAYMENT MODEL
 * ==========================================
 * MongoDB schema for storing Razorpay payments,
 * order IDs, verification signatures, and invoice references.
 */

const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingRequest",
      required: false,
      default: null,
    },
    role: {
      type: String,
      enum: ["student", "parent", "tutor", "admin"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentId: {
      type: String,
      default: "",
    },
    orderId: {
      type: String,
      required: true,
    },
    signature: {
      type: String,
      default: "",
    },
    invoiceId: {
      type: String,
      default: "",
    },
    paymentType: {
      type: String,
      enum: ["Wallet Topup", "Tuition Invoice Payment", "Tuition Fee Payment", "Payout Request"],
      default: "Wallet Topup",
    },
    paymentMethod: {
      type: String,
      default: "Razorpay",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Success", "Paid", "Failed", "Cancelled"],
      default: "Pending",
    },
    failureReason: {
      type: String,
      default: "",
    },
    isTestMode: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for financial lookups & reporting
paymentSchema.index({ user: 1, paymentStatus: 1 });
paymentSchema.index({ tutor: 1, paymentStatus: 1 });
paymentSchema.index({ orderId: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
