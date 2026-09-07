const mongoose = require("mongoose");

const tutorProfileSchema = new mongoose.Schema(
  {
    // Optional User Account Link (null for unauthenticated applicants)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },

    // Step 1: Personal & Location Details
    firstName: {
      type: String,
      trim: true,
      default: "",
    },
    lastName: {
      type: String,
      trim: true,
      default: "",
    },
    fullName: {
      type: String,
      trim: true,
      default: "",
    },
    gender: {
      type: String,
      default: "Not Specified",
    },
    dob: {
      type: String,
      default: "",
    },
    mobile: {
      type: String,
      trim: true,
      default: "",
    },
    whatsapp: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    alternateContact: {
      type: String,
      default: "",
    },
    currentAddress: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    state: {
      type: String,
      trim: true,
      default: "",
    },
    pincode: {
      type: String,
      trim: true,
      default: "",
    },
    teachingArea: {
      type: String,
      trim: true,
      default: "",
    },
    preferredRadius: {
      type: String,
      default: "10 km",
    },

    // Step 2: Qualification & Experience
    qualification: {
      type: String,
      default: "Degree",
      trim: true,
    },
    highestQualification: {
      type: String,
      default: "",
    },
    degreeName: {
      type: String,
      default: "",
    },
    collegeUniversity: {
      type: String,
      default: "",
    },
    passingYear: {
      type: String,
      default: "",
    },
    specialization: {
      type: String,
      default: "",
    },
    additionalQualifications: {
      type: String,
      default: "",
    },
    experienceType: {
      type: String,
      enum: ["Fresher", "Experienced"],
      default: "Experienced",
    },
    totalExperience: {
      type: String,
      default: "0",
    },
    experience: {
      type: Number,
      default: 0,
    },
    previousInstitute: {
      type: String,
      default: "",
    },
    experienceDuration: {
      type: String,
      default: "",
    },

    // Step 3: Teaching Details & Approach
    subjects: [
      {
        type: String,
        trim: true,
      },
    ],
    classes: [
      {
        type: String,
      },
    ],
    board: [
      {
        type: String,
        trim: true,
      },
    ],
    classType: [
      {
        type: String,
        trim: true,
      },
    ],
    specialization: [
      {
        type: String,
        trim: true,
      },
    ],
    teachingMethod: {
      type: String,
      default: "",
    },
    studentLevel: {
      type: String,
      default: "Intermediate",
    },
    mode: {
      type: String,
      enum: ["Online", "Offline", "Both", "Home Tuition", "Online Tuition"],
      default: "Both",
    },
    preferredTeachingAreas: {
      type: String,
      default: "",
    },
    maxTravelDistance: {
      type: String,
      default: "10 km",
    },
    preferredLocation: {
      type: String,
      default: "",
    },
    onlinePlatform: {
      type: String,
      default: "Zoom / Google Meet",
    },
    laptopAvailable: {
      type: String,
      default: "Yes",
    },
    stableInternet: {
      type: String,
      default: "Yes",
    },
    digitalTabletAvailable: {
      type: String,
      default: "No",
    },

    // Step 4: Availability & Fees
    availableDays: [
      {
        type: String,
      },
    ],
    startTime: {
      type: String,
      default: "09:00",
    },
    endTime: {
      type: String,
      default: "19:00",
    },
    fee: {
      type: Number,
      default: 0,
    },
    expectedFee: {
      type: String,
      default: "",
    },
    feeType: {
      type: String,
      enum: ["Per Hour", "Per Class", "Monthly"],
      default: "Per Hour",
    },
    negotiable: {
      type: String,
      default: "Yes",
    },
    additionalFeeNotes: {
      type: String,
      default: "",
    },

    // Step 4.1: Demo Class Slots & Settings (Separate from regular recurring availability)
    demoDuration: {
      type: Number,
      default: 60, // in minutes
    },
    demoAvailableDays: [
      {
        type: String,
        trim: true,
      },
    ],
    demoTimeSlots: [
      {
        type: String,
        trim: true,
      },
    ],

    // Step 5: Optional Payment Details & Declaration
    paymentDetails: {
      accountHolderName: { type: String, default: "" },
      bankName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      ifscCode: { type: String, default: "" },
      upiId: { type: String, default: "" },
    },
    declarationAccepted: {
      type: Boolean,
      default: false,
    },
    location: {
      type: String,
      default: "Online",
    },
    about: {
      type: String,
      default: "",
    },
    profileImage: {
      type: String,
      default: "",
    },
    rating: {
      type: Number,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    available: {
      type: Boolean,
      default: true,
    },
    coordinates: {
      lat: { type: Number, default: 28.6139 },
      lng: { type: Number, default: 77.2090 },
    },
    serviceAreaRadius: {
      type: Number,
      default: 10,
    },
    serviceAreas: [
      {
        type: String,
        trim: true,
      },
    ],
    homeVisitsEnabled: {
      type: Boolean,
      default: true,
    },
    language: [
      {
        type: String,
        trim: true,
      },
    ],
    availabilitySlots: [
      {
        type: String,
      },
    ],
    registrationStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    verificationStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    documents: [
      {
        name: { type: String, default: "Document" },
        docType: { type: String, default: "ID Proof" },
        fileUrl: { type: String, required: true },
        status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for tutor lookups and admin directory filtering
tutorProfileSchema.index({ user: 1 });
tutorProfileSchema.index({ isApproved: 1, isRejected: 1 });

const TutorProfile = mongoose.model("TutorProfile", tutorProfileSchema);

// Drop legacy unique user_1 index if present to allow unauthenticated & multiple applications
TutorProfile.cleanIndexes = async () => {
  try {
    const indexes = await TutorProfile.collection.indexes();
    if (indexes.some((idx) => idx.name === "user_1" && idx.unique)) {
      await TutorProfile.collection.dropIndex("user_1");
    }
  } catch (e) {}
};
TutorProfile.cleanIndexes();

module.exports = TutorProfile;