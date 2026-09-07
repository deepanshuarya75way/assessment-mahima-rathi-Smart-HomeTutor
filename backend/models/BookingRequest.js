const mongoose = require("mongoose");

const bookingRequestSchema = new mongoose.Schema(
  {
    student: {
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

    tutorProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TutorProfile",
      required: false,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Pending Admin Approval",
        "Pending Tutor Acceptance",
        "Approved",
        "Accepted",
        "Confirmed",
        "Completed",
        "Rejected",
        "Rejected by Admin",
        "Rejected by Tutor",
        "Cancelled",
        "Discontinued",
      ],
      default: "Pending Admin Approval",
    },

    message: {
      type: String,
      default: "",
    },

    // PART 2 LOCATION & TRIAL CLASS MANAGEMENT
    isTrial: {
      type: Boolean,
      default: true,
    },

    address: {
      type: String,
      default: "",
    },

    coordinates: {
      lat: { type: Number, default: 28.6139 },
      lng: { type: Number, default: 77.2090 },
    },

    isHomeVisit: {
      type: Boolean,
      default: false,
    },

    homeVisitStatus: {
      type: String,
      enum: ["Scheduled", "En Route", "Arrived", "Completed", "N/A"],
      default: "N/A",
    },

    // Approval tracking fields for Demo Class Workflow
    adminApproved: {
      type: Boolean,
      default: false,
    },

    tutorApproved: {
      type: Boolean,
      default: false,
    },

    adminRejected: {
      type: Boolean,
      default: false,
    },

    tutorRejected: {
      type: Boolean,
      default: false,
    },

    classType: {
      type: String,
      enum: ["demo", "regular"],
      default: "demo",
    },

    isChatUnlocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for high-frequency dashboard queries
bookingRequestSchema.index({ student: 1, status: 1 });
bookingRequestSchema.index({ tutor: 1, status: 1 });
bookingRequestSchema.index({ tutorProfile: 1, status: 1 });
bookingRequestSchema.index({ isTrial: 1, status: 1 });

module.exports = mongoose.model("BookingRequest", bookingRequestSchema);