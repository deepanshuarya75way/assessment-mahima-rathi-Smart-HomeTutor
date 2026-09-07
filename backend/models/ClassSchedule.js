/**
 * ==========================================
 * CLASS SCHEDULE MODEL
 * ==========================================
 * MongoDB schema for regular class sessions,
 * calendar dates, rescheduling, and student attendance logs.
 */

const mongoose = require("mongoose");

const classScheduleSchema = new mongoose.Schema(
  {
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingRequest",
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      default: "18:00",
    },
    endTime: {
      type: String,
      default: "19:00",
    },
    frequency: {
      type: String,
      default: "Weekly",
    },
    days: {
      type: String,
      default: "Mon, Wed",
    },
    mode: {
      type: String,
      enum: ["Online", "Offline"],
      default: "Online",
    },
    classType: {
      type: String,
      enum: ["demo", "regular"],
      default: "regular",
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    isTrial: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled", "Rescheduled", "Discontinued"],
      default: "Scheduled",
    },
    attendance: {
      type: String,
      enum: ["Pending", "Present", "Absent", "Late"],
      default: "Pending",
    },
    remindedToday: {
      type: Boolean,
      default: false,
    },
    remindedOneHour: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for schedule & calendar performance
classScheduleSchema.index({ student: 1, status: 1 });
classScheduleSchema.index({ tutor: 1, status: 1 });
classScheduleSchema.index({ date: 1 });

module.exports = mongoose.model("ClassSchedule", classScheduleSchema);
