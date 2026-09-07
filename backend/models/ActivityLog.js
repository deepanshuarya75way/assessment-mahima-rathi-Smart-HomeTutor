/**
 * ==========================================
 * ACTIVITY LOG MODEL
 * ==========================================
 * MongoDB schema for security audit trails, system activity, and security center monitoring.
 */

const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    userEmail: {
      type: String,
      default: "",
    },
    action: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      default: "127.0.0.1",
    },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
    },
    category: {
      type: String,
      enum: ["auth", "admin", "security", "user_action"],
      default: "user_action",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for security audit log filtering
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
