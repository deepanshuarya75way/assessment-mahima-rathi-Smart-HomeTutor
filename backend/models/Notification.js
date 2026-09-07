/**
 * ==========================================
 * NOTIFICATION MODEL
 * ==========================================
 * MongoDB schema for storing persistent user notifications for
 * Student, Parent, Tutor, and Admin users.
 */

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["student", "parent", "tutor", "admin"],
      default: "student",
    },
    sourceUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    sourceRole: {
      type: String,
      enum: ["student", "parent", "tutor", "admin", null],
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "fee",
        "class",
        "assignment",
        "payment",
        "announcement",
        "tutor_request",
        "certificate",
        "dispute",
        "verification",
        "enquiry",
        "system",
        "booking",
        "message",
        "class_discontinued",
      ],
      default: "system",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    read: {
      type: Boolean,
      default: false,
    },
    actionUrl: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to keep isRead and read synchronized
notificationSchema.pre("save", function () {
  if (this.isModified("isRead")) {
    this.read = this.isRead;
  } else if (this.isModified("read")) {
    this.isRead = this.read;
  }
});

// Indexes for notification queries
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ role: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
