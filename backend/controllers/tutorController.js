
const BookingRequest = require("../models/BookingRequest");
const TutorProfile = require("../models/TutorProfile");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const StudyMaterial = require("../models/StudyMaterial");
const StudyNote = require("../models/StudyNote");
const Review = require("../models/Review");
const ClassSchedule = require("../models/ClassSchedule");
const Certificate = require("../models/Certificate");
const CertificateRequest = require("../models/CertificateRequest");
const PayoutRequest = require("../models/PayoutRequest");
const mongoose = require("mongoose");
const { createNotification, createAdminNotification } = require("../utils/notificationHelper");
const { logUserActivity } = require("../utils/activityLogHelper");

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

exports.getTutorProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const tutorProfile = await TutorProfile.findOne({ user: user._id }).sort({ createdAt: -1 }).populate("user", "name email phone role tutorStatus");

    let tutorStatus = user.tutorStatus || "not_applied";
    if (tutorProfile) {
      if (tutorProfile.registrationStatus === "Approved" && tutorStatus !== "approved") {
        user.tutorStatus = "approved";
        await user.save();
        tutorStatus = "approved";
      } else if (tutorProfile.registrationStatus === "Pending" && tutorStatus === "not_applied") {
        user.tutorStatus = "pending";
        await user.save();
        tutorStatus = "pending";
      } else if (tutorProfile.registrationStatus === "Rejected" && tutorStatus !== "rejected") {
        user.tutorStatus = "rejected";
        await user.save();
        tutorStatus = "rejected";
      }
    }

    return res.status(200).json({
      success: true,
      tutorProfile: tutorProfile || null,
      tutorStatus,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Get Tutor Profile Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.updateTutorProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    let tutorProfile = await TutorProfile.findOne({ user: userId });

    if (!tutorProfile) {
      const user = await User.findById(userId);
      if (user && user.email) {
        tutorProfile = await TutorProfile.findOne({ email: user.email.toLowerCase() });
        if (tutorProfile && !tutorProfile.user) {
          tutorProfile.user = userId;
          await tutorProfile.save();
        }
      }
    }

    if (!tutorProfile) {
      return res.status(404).json({ success: false, message: "Tutor profile not found. Please complete tutor application first." });
    }

    const {
      firstName,
      lastName,
      fullName,
      gender,
      dob,
      mobile,
      whatsapp,
      email,
      alternateContact,
      currentAddress,
      city,
      state,
      pincode,
      teachingArea,
      preferredRadius,
      highestQualification,
      degreeName,
      collegeUniversity,
      passingYear,
      specialization,
      additionalQualifications,
      experienceType,
      totalExperience,
      previousInstitute,
      experienceDuration,
      classesYouTeach,
      board,
      subjectsYouTeach,
      classType,
      teachingMethod,
      studentLevel,
      teachingMode,
      preferredTeachingAreas,
      maxTravelDistance,
      preferredLocation,
      onlinePlatform,
      availableDays,
      startTime,
      endTime,
      expectedFee,
      feeType,
      negotiable,
      additionalFeeNotes,
      qualification,
      experience,
      subjects,
      classes,
      fee,
      location,
      mode,
      about,
      serviceAreaRadius,
      serviceAreas,
      homeVisitsEnabled,
      language,
    } = req.body;

    const parseArray = (input) => {
      if (!input) return [];
      if (Array.isArray(input)) return input.map((s) => String(s).trim()).filter(Boolean);
      if (typeof input === "string") {
        try {
          const parsed = JSON.parse(input);
          if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
        } catch (e) {}
        return input.split(",").map((s) => s.trim()).filter(Boolean);
      }
      return [];
    };

    const subjectsArray = parseArray(subjectsYouTeach || subjects);
    const classesArray = parseArray(classesYouTeach || classes);
    const boardArray = parseArray(board);
    const classTypeArray = parseArray(classType);
    const languageArray = parseArray(language);
    const serviceAreasArray = parseArray(serviceAreas);
    const availableDaysArray = parseArray(availableDays);

    const nameToUpdate = (fullName || (firstName || lastName ? `${firstName || ""} ${lastName || ""}` : tutorProfile.fullName)).trim();
    if (!nameToUpdate) {
      return res.status(400).json({ success: false, message: "Full Name cannot be empty." });
    }

    if (fee !== undefined && (isNaN(Number(fee)) || Number(fee) < 0)) {
      return res.status(400).json({ success: false, message: "Fee must be a valid non-negative number." });
    }

    if (subjectsArray.length === 0) {
      return res.status(400).json({ success: false, message: "At least one Subject is required." });
    }

    if (mobile && !/^\d{10}$/.test(String(mobile).trim())) {
      return res.status(400).json({ success: false, message: "Mobile number must contain exactly 10 digits." });
    }

    if (fullName || firstName || lastName) tutorProfile.fullName = nameToUpdate;
    if (firstName !== undefined) tutorProfile.firstName = firstName.trim();
    if (lastName !== undefined) tutorProfile.lastName = lastName.trim();
    if (gender !== undefined) tutorProfile.gender = gender;
    if (dob !== undefined) tutorProfile.dob = dob;
    if (mobile !== undefined) tutorProfile.mobile = String(mobile).trim();
    if (whatsapp !== undefined) tutorProfile.whatsapp = String(whatsapp).trim();
    if (email !== undefined) tutorProfile.email = String(email).trim().toLowerCase();
    if (alternateContact !== undefined) tutorProfile.alternateContact = String(alternateContact).trim();
    if (currentAddress !== undefined) tutorProfile.currentAddress = String(currentAddress).trim();
    if (city !== undefined) tutorProfile.city = String(city).trim();
    if (state !== undefined) tutorProfile.state = String(state).trim();
    if (pincode !== undefined) tutorProfile.pincode = String(pincode).trim();
    if (teachingArea !== undefined) tutorProfile.teachingArea = String(teachingArea).trim();
    if (preferredRadius !== undefined) tutorProfile.preferredRadius = String(preferredRadius).trim();

    if (qualification !== undefined || highestQualification !== undefined) {
      tutorProfile.qualification = qualification || highestQualification || tutorProfile.qualification;
    }
    if (highestQualification !== undefined) tutorProfile.highestQualification = highestQualification;
    if (degreeName !== undefined) tutorProfile.degreeName = degreeName;
    if (collegeUniversity !== undefined) tutorProfile.collegeUniversity = collegeUniversity;
    if (passingYear !== undefined) tutorProfile.passingYear = passingYear;
    if (experienceType !== undefined) tutorProfile.experienceType = experienceType;
    if (totalExperience !== undefined) tutorProfile.totalExperience = String(totalExperience);
    if (experience !== undefined) tutorProfile.experience = Number(experience) || 0;
    if (previousInstitute !== undefined) tutorProfile.previousInstitute = previousInstitute;

    tutorProfile.subjects = subjectsArray;
    if (classesArray.length > 0) tutorProfile.classes = classesArray;
    if (boardArray.length > 0) tutorProfile.board = boardArray;
    if (classTypeArray.length > 0) tutorProfile.classType = classTypeArray;
    if (languageArray.length > 0) tutorProfile.language = languageArray;
    if (serviceAreasArray.length > 0) tutorProfile.serviceAreas = serviceAreasArray;
    if (availableDaysArray.length > 0) tutorProfile.availableDays = availableDaysArray;

    if (mode !== undefined || teachingMode !== undefined) {
      tutorProfile.mode = mode || teachingMode || tutorProfile.mode;
    }
    if (location !== undefined) tutorProfile.location = location;
    if (about !== undefined) tutorProfile.about = about;
    if (startTime !== undefined) tutorProfile.startTime = startTime;
    if (endTime !== undefined) tutorProfile.endTime = endTime;

    if (fee !== undefined) tutorProfile.fee = Number(fee);
    if (expectedFee !== undefined) tutorProfile.expectedFee = String(expectedFee);
    if (feeType !== undefined) tutorProfile.feeType = feeType;
    if (negotiable !== undefined) tutorProfile.negotiable = negotiable;
    if (additionalFeeNotes !== undefined) tutorProfile.additionalFeeNotes = additionalFeeNotes;
    if (homeVisitsEnabled !== undefined) tutorProfile.homeVisitsEnabled = Boolean(homeVisitsEnabled);
    if (serviceAreaRadius !== undefined) tutorProfile.serviceAreaRadius = Number(serviceAreaRadius) || 10;

    await tutorProfile.save();

    if (nameToUpdate) {
      await User.findByIdAndUpdate(userId, { name: nameToUpdate });
    }

    await logUserActivity(userId, `Updated tutor profile teaching details (${subjectsArray.join(", ")})`, req.ip);

    return res.status(200).json({
      success: true,
      message: "Tutor profile updated successfully!",
      tutorProfile,
    });
  } catch (error) {
    console.error("Update Tutor Profile Error:", error);
    return res.status(500).json({ success: false, message: "Server Error updating profile." });
  }
};

exports.createTutorProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      fullName,
      gender,
      dob,
      mobile,
      whatsapp,
      email,
      alternateContact,
      currentAddress,
      city,
      state,
      pincode,
      teachingArea,
      preferredRadius,
      highestQualification,
      degreeName,
      collegeUniversity,
      passingYear,
      specialization,
      additionalQualifications,
      experienceType,
      totalExperience,
      previousInstitute,
      experienceDuration,
      classesYouTeach,
      board,
      subjectsYouTeach,
      classType,
      teachingMethod,
      studentLevel,
      teachingMode,
      preferredTeachingAreas,
      maxTravelDistance,
      preferredLocation,
      onlinePlatform,
      laptopAvailable,
      stableInternet,
      digitalTabletAvailable,
      availableDays,
      startTime,
      endTime,
      expectedFee,
      feeType,
      negotiable,
      additionalFeeNotes,
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
      upiId,
      declarationAccepted,
      qualification,
      experience,
      subjects,
      classes,
      fee,
      location,
      mode,
      about,
      lat,
      lng,
      serviceAreaRadius,
      serviceAreas,
      homeVisitsEnabled,
      language,
    } = req.body;

    const parseArray = (input) => {
      if (!input) return [];
      if (Array.isArray(input)) return input;
      if (typeof input === "string") {
        try {
          const parsed = JSON.parse(input);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
        return input.split(",").map((s) => s.trim()).filter(Boolean);
      }
      return [];
    };

    const subjectsArray = parseArray(subjectsYouTeach || subjects);
    const classesArray = parseArray(classesYouTeach || classes);
    const boardArray = parseArray(board);
    const classTypeArray = parseArray(classType);
    const specializationArray = parseArray(specialization);
    const languageArray = parseArray(language);
    const serviceAreasArray = parseArray(serviceAreas);
    const availableDaysArray = parseArray(availableDays);

    const userId = (req.user && req.user.id) ? req.user.id : null;

    // Backend mandatory fields validation across all steps
    const compName = (fullName || `${firstName || ""} ${lastName || ""}`).trim();
    if (!compName) {
      return res.status(400).json({ success: false, message: "First Name and Last Name / Full Name are required." });
    }
    if (!mobile || !/^\d{10}$/.test(String(mobile).trim())) {
      return res.status(400).json({ success: false, message: "Mobile number must contain exactly 10 digits." });
    }
    if (whatsapp && String(whatsapp).trim() && !/^\d{10}$/.test(String(whatsapp).trim())) {
      return res.status(400).json({ success: false, message: "WhatsApp number must contain exactly 10 digits." });
    }
    if (pincode && String(pincode).trim() && !/^\d{6}$/.test(String(pincode).trim())) {
      return res.status(400).json({ success: false, message: "Pincode must contain exactly 6 digits." });
    }
    if (!email || !String(email).trim()) {
      return res.status(400).json({ success: false, message: "Email Address is required." });
    }
    if (!currentAddress || !String(currentAddress).trim()) {
      return res.status(400).json({ success: false, message: "Current Address is required." });
    }
    if (!city || !String(city).trim()) {
      return res.status(400).json({ success: false, message: "City is required." });
    }
    if (!highestQualification && !qualification) {
      return res.status(400).json({ success: false, message: "Highest Qualification is required." });
    }
    if (!totalExperience && !experience) {
      return res.status(400).json({ success: false, message: "Total Teaching Experience is required." });
    }
    if (subjectsArray.length === 0) {
      return res.status(400).json({ success: false, message: "At least one Subject is required." });
    }
    if (classesArray.length === 0) {
      return res.status(400).json({ success: false, message: "At least one Class is required." });
    }

    // Process File Uploads from req.files
    const documents = [];
    let profileImageUrl = "";

    if (req.files) {
      if (req.files.profilePhoto && req.files.profilePhoto[0]) {
        profileImageUrl = `/uploads/tutors/${req.files.profilePhoto[0].filename}`;
      }
      if (req.files.qualificationDoc && req.files.qualificationDoc[0]) {
        documents.push({
          name: req.files.qualificationDoc[0].originalname || "Qualification Certificate",
          docType: "Qualification Certificate",
          fileUrl: `/uploads/tutors/${req.files.qualificationDoc[0].filename}`,
          status: "Pending",
          uploadedAt: new Date(),
        });
      }
      if (req.files.idProofDoc && req.files.idProofDoc[0]) {
        documents.push({
          name: req.files.idProofDoc[0].originalname || "ID Proof",
          docType: "ID Proof",
          fileUrl: `/uploads/tutors/${req.files.idProofDoc[0].filename}`,
          status: "Pending",
          uploadedAt: new Date(),
        });
      }
      if (req.files.experienceDoc && req.files.experienceDoc[0]) {
        documents.push({
          name: req.files.experienceDoc[0].originalname || "Experience Certificate",
          docType: "Experience Certificate",
          fileUrl: `/uploads/tutors/${req.files.experienceDoc[0].filename}`,
          status: "Pending",
          uploadedAt: new Date(),
        });
      }
      if (req.files.resumeDoc && req.files.resumeDoc[0]) {
        documents.push({
          name: req.files.resumeDoc[0].originalname || "Resume / CV",
          docType: "Resume / CV",
          fileUrl: `/uploads/tutors/${req.files.resumeDoc[0].filename}`,
          status: "Pending",
          uploadedAt: new Date(),
        });
      }
      if (req.files.addressProofDoc && req.files.addressProofDoc[0]) {
        documents.push({
          name: req.files.addressProofDoc[0].originalname || "Address Proof",
          docType: "Address Proof",
          fileUrl: `/uploads/tutors/${req.files.addressProofDoc[0].filename}`,
          status: "Pending",
          uploadedAt: new Date(),
        });
      }
    }

    const coordinatesObj = {
      lat: lat !== undefined ? Number(lat) : 28.6139,
      lng: lng !== undefined ? Number(lng) : 77.2090,
    };

    const numFee = Number(expectedFee || fee) || 0;
    const numExp = Number(totalExperience || experience) || 0;

    const computedFullName = (fullName || `${firstName || ''} ${lastName || ''}`).trim();

    // ALWAYS create a NEW TutorProfile application document
    const tutorProfile = await TutorProfile.create({
      user: userId,
      firstName: firstName || "",
      lastName: lastName || "",
      fullName: computedFullName || (req.user ? req.user.name : "") || "Tutor Applicant",
      gender: gender || "Not Specified",
      dob: dob || "",
      mobile: mobile || (req.user ? req.user.phone : "") || "",
      whatsapp: whatsapp || "",
      email: email || (req.user ? req.user.email : "") || "",
      alternateContact: alternateContact || "",
      currentAddress: currentAddress || "",
      city: city || "",
      state: state || "",
      pincode: pincode || "",
      teachingArea: teachingArea || "",
      preferredRadius: preferredRadius || "10 km",
      qualification: highestQualification || qualification || "Degree",
      highestQualification: highestQualification || qualification || "",
      degreeName: degreeName || "",
      collegeUniversity: collegeUniversity || "",
      passingYear: passingYear || "",
      specialization: specializationArray.length ? specializationArray : parseArray(specialization),
      additionalQualifications: additionalQualifications || "",
      experienceType: experienceType || "Experienced",
      totalExperience: String(totalExperience || experience || "0"),
      experience: numExp,
      previousInstitute: previousInstitute || "",
      experienceDuration: experienceDuration || "",
      subjects: subjectsArray,
      classes: classesArray,
      board: boardArray,
      classType: classTypeArray.length ? classTypeArray : ["One-to-One"],
      teachingMethod: teachingMethod || "",
      studentLevel: studentLevel || "Intermediate",
      mode: teachingMode || mode || "Both",
      preferredTeachingAreas: preferredTeachingAreas || "",
      maxTravelDistance: maxTravelDistance || "10 km",
      preferredLocation: preferredLocation || "",
      onlinePlatform: onlinePlatform || "Zoom / Google Meet",
      laptopAvailable: laptopAvailable || "Yes",
      stableInternet: stableInternet || "Yes",
      digitalTabletAvailable: digitalTabletAvailable || "No",
      availableDays: availableDaysArray,
      startTime: startTime || "09:00",
      endTime: endTime || "19:00",
      fee: numFee,
      expectedFee: String(expectedFee || fee || ""),
      feeType: feeType || "Per Hour",
      negotiable: negotiable || "Yes",
      additionalFeeNotes: additionalFeeNotes || "",
      paymentDetails: {
        accountHolderName: accountHolderName || "",
        bankName: bankName || "",
        accountNumber: accountNumber || "",
        ifscCode: ifscCode || "",
        upiId: upiId || "",
      },
      declarationAccepted: declarationAccepted === "true" || declarationAccepted === true,
      location: city || location || "Online",
      about: teachingMethod || about || "",
      profileImage: profileImageUrl,
      coordinates: coordinatesObj,
      serviceAreaRadius: Number(serviceAreaRadius) || 10,
      serviceAreas: serviceAreasArray,
      homeVisitsEnabled: homeVisitsEnabled !== undefined ? Boolean(homeVisitsEnabled) : true,
      language: languageArray,
      registrationStatus: "Pending",
      verificationStatus: "Pending",
      verified: false,
      documents: documents,
    });

    if (userId) {
      await User.findByIdAndUpdate(userId, { tutorStatus: "pending" });
      await logUserActivity(userId, `Registered new tutor application (#${tutorProfile._id})`, req.ip);
    }

    return res.status(201).json({
      success: true,
      message: "Tutor registration application submitted successfully.",
      tutorProfile,
      tutorStatus: "pending",
    });
  } catch (error) {
    console.error("Create Tutor Profile Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getAllTutors = async (req, res) => {
  try {
    const {
      subject,
      location,
      mode,
      minFee,
      maxFee,
      grade,
      board,
      gender,
      language,
      experience,
      minRating,
      search,
      available,
      lat,
      lng,
      distanceRadius,
      radius,
    } = req.query;

    let filter = {};

    if (available === "true") filter.available = true;

    // 1. Subject filter with synonym expansion
    if (subject && subject !== "all") {
      const subClean = subject.trim();
      let pattern = subClean;
      if (/^math/i.test(subClean)) {
        pattern = "Math|Mathematics|Algebra|Calculus|Geometry|Trigonometry";
      } else if (/^coding$/i.test(subClean) || /^computer/i.test(subClean) || /^programming/i.test(subClean)) {
        pattern = "Coding|Computer|Programming|Python|Java|C\\+\\+|JavaScript|Web|IT|Tech";
      } else if (/^languages?$/i.test(subClean)) {
        pattern = "Language|English|Hindi|French|German|Spanish|Sanskrit|Punjabi|Tamil|Telugu|Kannada";
      } else if (/^physics$/i.test(subClean)) {
        pattern = "Physics|Science";
      } else if (/^chemistry$/i.test(subClean)) {
        pattern = "Chemistry|Science";
      } else if (/^biology$/i.test(subClean)) {
        pattern = "Biology|Science|Zoology|Botany";
      } else if (/^science$/i.test(subClean)) {
        pattern = "Science|Physics|Chemistry|Biology|PCB|PCM";
      }
      filter.subjects = { $regex: pattern, $options: "i" };
    }

    const isGpsActive =
      lat !== undefined &&
      lng !== undefined &&
      lat !== null &&
      lng !== null &&
      String(lat).trim() !== "" &&
      String(lng).trim() !== "";

    // 2. Location filter searching across multiple location fields (applied ONLY when GPS coordinates are NOT passed)
    if (!isGpsActive && location && location !== "all") {
      const locClean = location.trim();
      if (locClean.toLowerCase() === "online") {
        filter.$or = [
          { location: { $regex: "online", $options: "i" } },
          { mode: { $regex: "online", $options: "i" } },
        ];
      } else {
        const locPattern = locClean.toLowerCase().includes("delhi")
          ? "Delhi"
          : locClean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const locRegex = { $regex: locPattern, $options: "i" };
        filter.$or = [
          { location: locRegex },
          { city: locRegex },
          { state: locRegex },
          { currentAddress: locRegex },
          { teachingArea: locRegex },
          { preferredLocation: locRegex },
          { serviceAreas: locRegex },
        ];
      }
    }

    // 3. Mode filter matching variations
    if (mode && mode !== "all") {
      if (mode === "Home" || mode === "Offline") {
        filter.mode = { $regex: "Home|Offline|Both", $options: "i" };
      } else if (mode === "Online") {
        filter.mode = { $regex: "Online|Both", $options: "i" };
      } else if (mode === "Both") {
        filter.mode = { $regex: "Both|Online|Offline|Home", $options: "i" };
      } else {
        filter.mode = { $regex: mode, $options: "i" };
      }
    }

    // 4. Grade / Class filter matching numeric and text standards
    if (grade && grade !== "all") {
      if (grade === "Class 1-5" || grade === "Grade 1-5") {
        filter.classes = { $regex: "(Class\\s*[1-5]\\b|Grade\\s*[1-5]\\b|\\b[1-5](st|nd|rd|th)?\\b|Primary|All Grades|Class 1 to 12)", $options: "i" };
      } else if (grade === "Class 6-8" || grade === "Grade 6-8") {
        filter.classes = { $regex: "(Class\\s*[6-8]\\b|Grade\\s*[6-8]\\b|\\b[6-8](th)?\\b|Middle|All Grades|Class 1 to 12)", $options: "i" };
      } else if (grade === "Class 9-10" || grade === "Grade 9-10") {
        filter.classes = { $regex: "(Class\\s*(9|10)\\b|Grade\\s*(9|10)\\b|\\b(9|10)(th)?\\b|\\bIX\\b|\\bX\\b|Secondary|All Grades|Class 1 to 12)", $options: "i" };
      } else if (grade === "Class 11-12" || grade === "Grade 11-12") {
        filter.classes = { $regex: "(Class\\s*(11|12)\\b|Grade\\s*(11|12)\\b|\\b(11|12)(th)?\\b|\\bXI\\b|\\bXII\\b|Senior|All Grades|Class 1 to 12)", $options: "i" };
      } else if (grade.startsWith("Class ")) {
        const num = grade.replace("Class ", "").trim();
        filter.classes = { $regex: `(Class\\s*${num}\\b|Grade\\s*${num}\\b|\\b${num}(st|nd|rd|th)?\\b|All Grades|Class 1 to 12)`, $options: "i" };
      } else {
        filter.classes = { $regex: grade, $options: "i" };
      }
    }

    // 5. Board filter
    if (board && board !== "all") {
      const cleanBoard = board.replace(/board/i, "").trim();
      filter.board = { $regex: cleanBoard, $options: "i" };
    }

    // 6. Gender filter
    if (gender && gender !== "all") {
      filter.gender = { $regex: `^${gender}`, $options: "i" };
    }

    // 7. Language filter
    if (language && language !== "all") {
      filter.language = { $regex: language, $options: "i" };
    }

    // 8. Rating filter
    if (minRating && Number(minRating) > 0) {
      filter.rating = { $gte: Number(minRating) };
    }

    // 9. Fee range filter
    if (minFee || maxFee) {
      filter.fee = {};
      if (minFee) filter.fee.$gte = Number(minFee);
      if (maxFee) filter.fee.$lte = Number(maxFee);
    }

    // 10. Experience range filter
    if (experience && experience !== "all") {
      if (experience.includes("3-5")) {
        filter.experience = { $gte: 3, $lte: 5 };
      } else if (experience.includes("5-10")) {
        filter.experience = { $gte: 5, $lte: 10 };
      } else if (experience.includes("10+")) {
        filter.experience = { $gte: 10 };
      }
    }

    let tutors = await TutorProfile.find(filter).populate("user", "name email phone").lean();

    // 11. Keyword / Name Search filter (safe regex search)
    if (search && search.trim()) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(safeSearch, "i");
      tutors = tutors.filter((t) => {
        const userNameMatch = t.user && t.user.name && searchRegex.test(t.user.name);
        const nameMatch = userNameMatch ||
                          (t.fullName && searchRegex.test(t.fullName)) ||
                          (t.firstName && searchRegex.test(t.firstName)) ||
                          (t.lastName && searchRegex.test(t.lastName));
        const qualMatch = t.qualification && searchRegex.test(t.qualification);
        const aboutMatch = t.about && searchRegex.test(t.about);
        const locMatch = (t.location && searchRegex.test(t.location)) ||
                         (t.city && searchRegex.test(t.city)) ||
                         (t.state && searchRegex.test(t.state)) ||
                         (t.currentAddress && searchRegex.test(t.currentAddress));
        const subjMatch = Array.isArray(t.subjects) && t.subjects.some((s) => typeof s === "string" && searchRegex.test(s));
        const classMatch = Array.isArray(t.classes) && t.classes.some((c) => typeof c === "string" && searchRegex.test(c));
        const boardMatch = Array.isArray(t.board) && t.board.some((b) => typeof b === "string" && searchRegex.test(b));
        const specMatch = (typeof t.specialization === "string" && searchRegex.test(t.specialization)) ||
                          (Array.isArray(t.specialization) && t.specialization.some((sp) => typeof sp === "string" && searchRegex.test(sp)));
        return nameMatch || qualMatch || aboutMatch || locMatch || subjMatch || classMatch || boardMatch || specMatch;
      });
    }

    // 12. Geolocation & Distance Calculation
    if (isGpsActive) {
      const userLat = Number(lat);
      const userLng = Number(lng);
      if (!isNaN(userLat) && !isNaN(userLng)) {
        const effectiveRadius = distanceRadius || radius;
        const maxDistance =
          effectiveRadius && effectiveRadius !== "all"
            ? Number(String(effectiveRadius).replace("km", "").trim()) || 50
            : 50;

        tutors = tutors
          .map((t) => {
            const hasLat = t.coordinates && typeof t.coordinates.lat === "number" && !isNaN(t.coordinates.lat);
            const hasLng = t.coordinates && typeof t.coordinates.lng === "number" && !isNaN(t.coordinates.lng);

            const tutorLat = hasLat ? t.coordinates.lat : 28.6139;
            const tutorLng = hasLng ? t.coordinates.lng : 77.2090;

            const isSchemaDefault = tutorLat === 28.6139 && tutorLng === 77.2090;
            const dist = calculateDistanceKm(userLat, userLng, tutorLat, tutorLng);

            let cityMatches = false;
            if (location && location !== "all") {
              const targetLoc = location.trim().toLowerCase();
              const fieldsToTest = [
                t.city,
                t.location,
                t.state,
                t.currentAddress,
                t.teachingArea,
                t.preferredLocation,
                ...(Array.isArray(t.serviceAreas) ? t.serviceAreas : []),
              ];
              cityMatches = fieldsToTest.some(
                (field) => typeof field === "string" && field.toLowerCase().includes(targetLoc)
              );
            }

            let isWithinRadius = false;
            let finalDistance = null;

            if (!isSchemaDefault) {
              // Real custom coordinates exist
              finalDistance = Math.round(dist * 10) / 10;
              isWithinRadius = finalDistance <= maxDistance;
            } else {
              // Schema default coordinates (28.6139, 77.2090)
              if (dist <= maxDistance) {
                // User is in Delhi area where default coordinates match user location
                finalDistance = Math.round(dist * 10) / 10;
                isWithinRadius = true;
              } else if (cityMatches) {
                // Tutor city matches the target location (e.g. Dehradun) but coords are default placeholder
                isWithinRadius = true;
                finalDistance = null;
              }
            }

            return {
              ...t,
              distanceKm: finalDistance,
              isWithinRadius,
            };
          })
          .filter((t) => t.isWithinRadius)
          .sort((a, b) => {
            if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
            if (a.distanceKm !== null) return -1;
            if (b.distanceKm !== null) return 1;
            return 0;
          });
      }
    }

    return res.status(200).json({ success: true, count: tutors.length, tutors });
  } catch (error) {
    console.error("Get All Tutors Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};


exports.getBookingRequests = async (req, res) => {
  try {
    const tutorId = req.user.id;
    // Only return demo class requests that have passed Admin Approval and are awaiting Tutor response or already actioned by tutor
    const requests = await BookingRequest.find({
      tutor: tutorId,
      status: { $in: ["Pending Tutor Acceptance", "Approved", "Accepted", "Confirmed", "Rejected by Tutor"] },
    })
      .populate("student", "name email phone role")
      .populate("tutorProfile", "qualification fee subjects location primarySubject")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, requests });
  } catch (err) {
    console.error("Get Booking Requests Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.acceptBookingRequest = async (req, res) => {
  try {
    const requestId = req.params.id || req.params.bookingId;
    const booking = await BookingRequest.findOne({ _id: requestId, tutor: req.user.id })
      .populate("student", "name email phone");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Demo class request not found or not assigned to you." });
    }

    // Set Tutor approval flag (Requirement 3)
    booking.tutorApproved = true;
    booking.tutorRejected = false;

    const { createDemoClassScheduleIfBothApproved } = require("../utils/demoScheduleHelper");
    const tutorUser = await User.findById(req.user.id);
    const tutorName = tutorUser ? tutorUser.name : "Tutor";

    // RULE 4: Check if BOTH Admin and Tutor have approved
    if (booking.adminApproved) {
      booking.status = "Confirmed";
      await booking.save();

      // Trigger automatic demo class creation ONLY when adminApproved && tutorApproved
      await createDemoClassScheduleIfBothApproved(booking._id, req.app);

      return res.status(200).json({
        success: true,
        message: `Demo class request accepted by both Admin & Tutor! Class scheduled.`,
        booking,
      });
    }

    // Otherwise, keep request pending Admin approval
    booking.status = "Pending Admin Approval";
    await booking.save();

    // Deliver notification to Student that Tutor has accepted and Admin approval is pending
    if (booking.student) {
      await createNotification({
        userId: booking.student._id,
        title: "Demo Class Request Update ⌛",
        message: `${tutorName} has accepted your demo class request. Waiting for final Admin approval.`,
        type: "booking",
        app: req.app,
      });
    }

    await logUserActivity(req.user.id, `Tutor ${tutorName} accepted demo class request (${booking._id}) -> Waiting for Admin approval`, req.ip);

    return res.status(200).json({
      success: true,
      message: `Demo class request ACCEPTED successfully! Sent to Admin for final approval.`,
      booking,
    });
  } catch (err) {
    console.error("Tutor Accept Booking Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.rejectBookingRequest = async (req, res) => {
  try {
    const requestId = req.params.id || req.params.bookingId;
    const booking = await BookingRequest.findOne({ _id: requestId, tutor: req.user.id })
      .populate("student", "name email phone");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Demo class request not found or not assigned to you." });
    }

    booking.tutorApproved = false;
    booking.tutorRejected = true;
    booking.status = "Rejected by Tutor";
    await booking.save();

    const tutorUser = await User.findById(req.user.id);
    const tutorName = tutorUser ? tutorUser.name : "Tutor";

    // Deliver notification to Student that Tutor declined
    if (booking.student) {
      await createNotification({
        userId: booking.student._id,
        title: "Demo Class Request Update",
        message: `Your demo class request has been declined by the tutor.`,
        type: "booking",
        app: req.app,
      });
    }

    await logUserActivity(req.user.id, `Tutor ${tutorName} declined demo class request (${booking._id})`, req.ip);

    return res.status(200).json({
      success: true,
      message: "Demo class request declined.",
      booking,
    });
  } catch (err) {
    console.error("Tutor Reject Booking Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.respondBookingRequest = async (req, res) => {
  const { action } = req.body;
  if (action === 'accept') {
    return exports.acceptBookingRequest(req, res);
  } else {
    return exports.rejectBookingRequest(req, res);
  }
};

exports.updateHomeVisitStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body; // Scheduled, En Route, Arrived, Completed

    if (!["Scheduled", "En Route", "Arrived", "Completed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid home visit status." });
    }

    const booking = await BookingRequest.findOne({ _id: bookingId, tutor: req.user.id }).populate("student", "name");
    if (!booking) {
      return res.status(404).json({ success: false, message: "Home visit booking not found." });
    }

    booking.isHomeVisit = true;
    booking.homeVisitStatus = status;
    await booking.save();

    if (booking.student) {
      await createNotification({
        userId: booking.student._id,
        title: "Home Visit Update 🚗",
        message: `Your tutor home visit status is now: ${status}.`,
        type: "class",
        app: req.app,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Home visit status updated to ${status}.`,
      booking,
    });
  } catch (err) {
    console.error("Update Home Visit Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};


exports.uploadDocuments = async (req, res) => {
  try {
    const tutorId = req.user.id;
    const { docType, name, fileUrl: bodyFileUrl } = req.body;

    let fileUrl = bodyFileUrl || "";
    if (req.file) {
      fileUrl = `/uploads/documents/${req.file.filename}`;
    }

    if (!fileUrl) {
      return res.status(400).json({ success: false, message: "Document file or URL is required." });
    }

    const profile = await TutorProfile.findOne({ user: tutorId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Tutor profile not found." });
    }

    const newDoc = {
      name: name || "ID Proof / Certificate",
      docType: docType || "ID Proof",
      fileUrl,
      status: "Pending",
      uploadedAt: new Date(),
    };

    profile.documents.push(newDoc);
    profile.verificationStatus = "Pending";
    await profile.save();

    const kycTutorName = req.user.name || "Tutor";
    await logUserActivity(tutorId, `${kycTutorName} uploaded ${docType || "verification document"} for KYC approval`, req.ip);

    return res.status(201).json({
      success: true,
      message: "Verification document uploaded successfully! Admin review in progress.",
      documents: profile.documents,
      verificationStatus: profile.verificationStatus,
    });
  } catch (err) {
    console.error("Upload Documents Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.requestCertificate = async (req, res) => {
  try {
    const tutorId = req.user.id;
    const { studentId, courseName, tutorRemarks, attendancePercentage } = req.body;

    if (!studentId || !courseName) {
      return res.status(400).json({ success: false, message: "Student ID and course name are required." });
    }

    const existing = await CertificateRequest.findOne({
      student: studentId,
      courseName: courseName.trim(),
      status: { $in: ["Pending", "Approved"] },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: existing.status === "Approved"
          ? "Certificate has already been issued for this course."
          : "Certificate approval request is already pending Admin review.",
      });
    }

    const certRequest = await CertificateRequest.create({
      student: studentId,
      tutor: tutorId,
      courseName: courseName.trim(),
      tutorRemarks: tutorRemarks || "Completed all required modules and attendance.",
      attendancePercentage: attendancePercentage ? Number(attendancePercentage) : 100,
      status: "Pending",
    });

    const admins = await User.find({ role: "admin" }).select("_id");
    for (const admin of admins) {
      await createNotification({
        userId: admin._id,
        title: "Certificate Approval Request 🎓",
        message: `New certificate approval request for ${courseName} requires review.`,
        type: "system",
        app: req.app,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Course completion request submitted for Admin approval successfully!",
      request: certRequest,
    });
  } catch (err) {
    console.error("Request Certificate Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.issueCertificate = exports.requestCertificate;

exports.getTutorDashboardStats = async (req, res) => {
  try {
    const tutorId = req.user.id;

    // Fetch tutor profile
    const profile = await TutorProfile.findOne({ user: tutorId });

    // Fetch booking request counts
    const pendingRequests = await BookingRequest.countDocuments({ tutor: tutorId, status: "Pending" });
    const acceptedRequests = await BookingRequest.find({ tutor: tutorId, status: "Accepted" }).populate("student", "name email phone");

    // Unique active students count
    const uniqueStudentIds = new Set(acceptedRequests.map((b) => b.student._id.toString()));
    const activeStudentCount = uniqueStudentIds.size;

    // Today's classes schedule
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todaysClasses = await ClassSchedule.find({
      tutor: tutorId,
      date: { $gte: startOfDay, $lte: endOfDay },
    }).populate("student", "name email");

    // Attendance summary stats
    const totalClasses = await ClassSchedule.countDocuments({ tutor: tutorId });
    const completedClasses = await ClassSchedule.countDocuments({ tutor: tutorId, status: "Completed" });
    const presentAttendanceCount = await ClassSchedule.countDocuments({ tutor: tutorId, attendance: "Present" });

    const user = await User.findById(tutorId).select("walletBalance referralCode referralEarnings");
    const userWallet = user ? user.walletBalance || 0 : 0;

    let userReferralCode = user ? user.referralCode : "";
    if (user && !userReferralCode) {
      userReferralCode = "REF-" + user._id.toString().slice(-6).toUpperCase();
      user.referralCode = userReferralCode;
      await user.save();
    }
    const referredCount = userReferralCode
      ? await User.countDocuments({ referredBy: userReferralCode })
      : 0;

    const completedClassesList = await ClassSchedule.find({ tutor: tutorId, status: "Completed" });
    const classEarnings = completedClassesList.length * (profile ? profile.fee || profile.hourlyRate || 500 : 500);

    const creditTxns = await Transaction.find({ user: tutorId, status: "Completed", type: { $in: ["Credit", "Tuition Fee Payment", "Wallet Topup"] } });
    const creditEarnings = creditTxns.reduce((sum, t) => sum + (t.amount || 0), 0);

    const grossEarnings = classEarnings + creditEarnings + userWallet;

    const approvedPayouts = await PayoutRequest.find({ tutor: tutorId, status: "Approved" });
    const totalPayoutsDeducted = approvedPayouts.reduce((sum, p) => sum + p.amount, 0);

    const availableBalance = Math.max(0, grossEarnings - totalPayoutsDeducted);

    const payoutHistory = await PayoutRequest.find({ tutor: tutorId }).sort({ createdAt: -1 });
    const pendingPayoutRequest = payoutHistory.find((p) => p.status === "Pending") || null;

 
    const studyMaterialsCount = await StudyMaterial.countDocuments({ tutor: tutorId });

  
    const reviews = profile
      ? await Review.find({ tutorProfile: profile._id }).populate("student", "name").sort({ createdAt: -1 })
      : [];

    let avgRating = profile ? profile.rating : 5.0;
    let totalReviews = profile ? profile.totalReviews : reviews.length;

    return res.status(200).json({
      success: true,
      stats: {
        totalEarnings: grossEarnings,
        availableBalance,
        activeStudentCount,
        pendingRequestsCount: pendingRequests,
        acceptedRequestsCount: acceptedRequests.length,
        todaysClassesCount: todaysClasses.length,
        totalClassesConducted: totalClasses,
        completedClassesCount: completedClasses,
        presentAttendanceCount,
        studyMaterialsCount,
        rating: avgRating,
        totalReviews,
        referredCount,
        referralCode: userReferralCode,
        referralEarnings: user ? user.referralEarnings || 0 : 0,
      },
      todaysClasses,
      acceptedStudents: acceptedRequests.map((b) => b.student),
      reviews,
      documents: profile ? profile.documents : [],
      verificationStatus: profile ? profile.verificationStatus : "Pending",
      payoutHistory,
      pendingPayoutRequest,
      referralCode: userReferralCode,
      referralEarnings: user ? user.referralEarnings || 0 : 0,
      referredCount,
    });
  } catch (err) {
    console.error("Get Tutor Dashboard Stats Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getMyStudents = async (req, res) => {
  try {
    const tutorId = req.user.id;
    const acceptedBookings = await BookingRequest.find({ tutor: tutorId, status: "Accepted" })
      .populate("student", "name email phone role")
      .sort({ updatedAt: -1 });

    const studentMap = new Map();
    for (const b of acceptedBookings) {
      if (b.student && b.student._id && !studentMap.has(b.student._id.toString())) {
        studentMap.set(b.student._id.toString(), {
          _id: b.student._id,
          name: b.student.name || "Student",
          email: b.student.email,
          subject: b.subject || "General",
        });
      }
    }

    const students = Array.from(studentMap.values());
    return res.status(200).json({ success: true, students });
  } catch (err) {
    console.error("Get My Students Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.uploadNote = async (req, res) => {
  try {
    const { title, subject, class: className, student: studentId, board } = req.body;
    const tutorId = req.user.id;

    if (!title || !subject || !className) {
      return res.status(400).json({ success: false, message: "Title, subject, and class are required." });
    }

    if (!studentId) {
      return res.status(400).json({ success: false, message: "Please select a student to receive these notes." });
    }

    // Verify student is legitimately assigned/accepted by this tutor
    const isAssigned = await BookingRequest.exists({
      tutor: tutorId,
      student: studentId,
      status: { $in: ["Accepted", "Approved", "Confirmed"] },
    });
    if (!isAssigned) {
      return res.status(403).json({ success: false, message: "Unauthorized: You can only share notes with your assigned students." });
    }

    let fileUrl = "";
    if (req.file) {
      fileUrl = `/uploads/documents/${req.file.filename}`;
    }

    const note = await StudyNote.create({
      tutor: tutorId,
      student: studentId,
      title,
      subject,
      board: board || "CBSE",
      class: className,
      fileUrl: fileUrl || "/uploads/documents/default-notes.pdf",
    });

    await StudyMaterial.create({
      tutor: tutorId,
      student: studentId,
      title,
      subject,
      targetGrade: className,
      fileUrl: fileUrl || "/uploads/documents/default-notes.pdf",
      description: `Class: ${className}`,
    }).catch(() => {});

    await createNotification({
      userId: studentId,
      title: "New Study Note Received 📚",
      message: `Your tutor uploaded new notes: ${title} (${subject})`,
      type: "assignment",
      app: req.app,
    });

    const matTutorName = req.user.name || "Tutor";
    await logUserActivity(tutorId, `${matTutorName} uploaded note: ${title}`, req.ip);

    return res.status(201).json({
      success: true,
      message: "Study Note uploaded and shared with student successfully!",
      note,
    });
  } catch (err) {
    console.error("Upload Note Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.uploadMaterial = async (req, res) => {
  try {
    const { title, subject, targetGrade, description, fileUrl: bodyFileUrl, student: studentId } = req.body;
    const tutorId = req.user.id;

    if (!title || !subject) {
      return res.status(400).json({ success: false, message: "Title and subject are required." });
    }

    if (!studentId) {
      return res.status(400).json({ success: false, message: "Please select a student to receive these notes." });
    }

    const isAssigned = await BookingRequest.exists({
      tutor: tutorId,
      student: studentId,
      status: { $in: ["Accepted", "Approved", "Confirmed"] },
    });
    if (!isAssigned) {
      return res.status(403).json({ success: false, message: "Unauthorized: You can only share notes with your assigned students." });
    }

    let fileUrl = bodyFileUrl || "";
    if (req.file) {
      fileUrl = `/uploads/materials/${req.file.filename}`;
    }

    const material = await StudyMaterial.create({
      tutor: tutorId,
      student: studentId,
      title,
      subject,
      targetGrade: targetGrade || "All Grades",
      fileUrl: fileUrl || "/uploads/materials/default-notes.pdf",
      description: description || "",
    });

    await StudyNote.create({
      tutor: tutorId,
      student: studentId,
      title,
      subject,
      board: "CBSE",
      class: targetGrade || "General",
      fileUrl: fileUrl || "/uploads/materials/default-notes.pdf",
    }).catch(() => {});

    await createNotification({
      userId: studentId,
      title: "New Assignment / Study Material 📚",
      message: `Your tutor uploaded new material: ${title} (${subject})`,
      type: "assignment",
      app: req.app,
    });

    const matTutorName = req.user.name || "Tutor";
    await logUserActivity(tutorId, `${matTutorName} uploaded study material: ${title}`, req.ip);

    return res.status(201).json({
      success: true,
      message: "Study material / homework uploaded and shared successfully!",
      material,
    });
  } catch (err) {
    console.error("Upload Material Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getTutorStudyMaterials = async (req, res) => {
  try {
    const materials = await StudyMaterial.find({ tutor: req.user.id })
      .populate("student", "name email")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, materials });
  } catch (err) {
    console.error("Get Tutor Study Materials Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};


exports.requestPayout = async (req, res) => {
  try {
    const { amount, paymentDetails } = req.body;
    const tutorId = req.user.id;
    const reqAmount = Number(amount);

    if (!reqAmount || reqAmount <= 0) {
      return res.status(400).json({ success: false, message: "Valid payout amount is required." });
    }

    if (reqAmount < 100) {
      return res.status(400).json({ success: false, message: "Minimum payout request amount is ₹100.00." });
    }

    
    const existingPending = await PayoutRequest.findOne({ tutor: tutorId, status: "Pending" });
    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: `You already have a pending payout request of ₹${existingPending.amount.toLocaleString("en-IN")} submitted on ${new Date(existingPending.requestedAt).toLocaleDateString("en-IN")}. Please await admin review.`,
      });
    }

    const profile = await TutorProfile.findOne({ user: tutorId });
    const user = await User.findById(tutorId).select("walletBalance");
    const userWallet = user ? user.walletBalance || 0 : 0;

    const completedClassesList = await ClassSchedule.find({ tutor: tutorId, status: "Completed" });
    const classEarnings = completedClassesList.length * (profile ? profile.fee || profile.hourlyRate || 500 : 500);

    const creditTxns = await Transaction.find({ user: tutorId, status: "Completed", type: { $in: ["Credit", "Tuition Fee Payment", "Wallet Topup"] } });
    const creditEarnings = creditTxns.reduce((sum, t) => sum + (t.amount || 0), 0);

    const grossEarnings = classEarnings + creditEarnings + userWallet;

    const approvedPayouts = await PayoutRequest.find({ tutor: tutorId, status: "Approved" });
    const totalPayoutsDeducted = approvedPayouts.reduce((sum, p) => sum + p.amount, 0);

    const availableBalance = Math.max(0, grossEarnings - totalPayoutsDeducted);

    if (reqAmount > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Requested amount (₹${reqAmount.toLocaleString("en-IN")}) exceeds your available earnings balance of ₹${availableBalance.toLocaleString("en-IN")}.`,
      });
    }

    const payoutRequest = await PayoutRequest.create({
      tutor: tutorId,
      amount: reqAmount,
      status: "Pending",
      paymentDetails: paymentDetails || {},
      requestedAt: new Date(),
    });

    await createNotification({
      userId: tutorId,
      title: "Payout Request Submitted 💰",
      message: `Your payout request of ₹${reqAmount.toLocaleString("en-IN")} has been submitted for admin verification.`,
      type: "payment",
      app: req.app,
    });

    const payoutTutorName = req.user.name || "Tutor";

    await createAdminNotification({
      title: "New Payout Request",
      message: `${payoutTutorName} (Tutor) submitted a payout request of ₹${reqAmount.toLocaleString("en-IN")}.`,
      sourceUser: tutorId,
      sourceRole: "tutor",
      type: "payment",
      actionUrl: "/dashboard/admin?tab=finance",
      app: req.app,
    });

    await logUserActivity(tutorId, `${payoutTutorName} submitted a payout request of ₹${reqAmount}`, req.ip);

    return res.status(201).json({
      success: true,
      message: `Payout request of ₹${reqAmount.toLocaleString("en-IN")} submitted successfully! Awaiting admin review.`,
      payoutRequest,
    });
  } catch (err) {
    console.error("Request Payout Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getTutorById = async (req, res) => {
  try {
    const tutorId = req.params.id;
    if (!tutorId || !mongoose.Types.ObjectId.isValid(tutorId)) {
      return res.status(400).json({ success: false, message: "Invalid Tutor ID format." });
    }

    const tutor = await TutorProfile.findById(tutorId).populate("user", "name email phone avatar");
    if (!tutor) {
      return res.status(404).json({ success: false, message: "Tutor Profile Not Found" });
    }

    const reviews = await Review.find({ tutorProfile: tutor._id })
      .populate("student", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      tutor,
      reviews,
    });
  } catch (err) {
    console.error("Get Tutor By ID Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.requestCertificate = async (req, res) => {
  try {
    const tutorId = req.user.id;
    const { studentId, courseName, attendancePercentage, completedClasses, tutorRemarks } = req.body;

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Valid student ID is required." });
    }

    if (!courseName || !courseName.trim()) {
      return res.status(400).json({ success: false, message: "Course or Subject name is required." });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student account not found." });
    }

    const existingReq = await CertificateRequest.findOne({
      tutor: tutorId,
      student: studentId,
      courseName: courseName.trim(),
      status: { $in: ["Pending", "Approved"] },
    });

    if (existingReq) {
      return res.status(400).json({
        success: false,
        message: `A certificate request for "${courseName}" with this student is already ${existingReq.status}.`,
        request: existingReq,
      });
    }

    const certRequest = await CertificateRequest.create({
      tutor: tutorId,
      student: studentId,
      courseName: courseName.trim(),
      attendancePercentage: Number(attendancePercentage) || 100,
      completedClasses: Number(completedClasses) || 12,
      tutorRemarks: tutorRemarks || "Course completed successfully.",
      status: "Pending",
    });

    const tutorName = req.user.name || "Tutor";
    await createAdminNotification({
      title: "New Certificate Request 🎓",
      message: `${tutorName} (Tutor) requested a completion certificate for ${student.name || "Student"} (${courseName}).`,
      sourceUser: tutorId,
      sourceRole: "tutor",
      type: "certificate",
      actionUrl: "/dashboard/admin?tab=certificates",
      app: req.app,
    });

    return res.status(201).json({
      success: true,
      message: `Certificate request for "${courseName}" submitted to Admin for approval.`,
      request: certRequest,
    });
  } catch (err) {
    console.error("Request Certificate Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.issueCertificate = exports.requestCertificate;

exports.getReceivedHomework = async (req, res) => {
  try {
    const tutorId = req.user.id;
    const homeworks = await StudyMaterial.find({
      tutor: tutorId,
      student: { $ne: null },
      type: "homework",
    })
      .populate("student", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, homeworks });
  } catch (err) {
    console.error("Get Received Homework Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};