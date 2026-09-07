/**
 * ==========================================
 * VIDEO CALL ROUTES
 * ==========================================
 * Express routes for initiating and authorizing WebRTC video calls.
 */

const express = require("express");
const router = express.Router();
const videoCallController = require("../controllers/videoCallController");
const { requireAuth } = require("../middleware/authMiddleware");

// JSON API Endpoints
router.get("/details/:bookingId", requireAuth, videoCallController.getVideoCallDetails);
router.get("/status/:bookingId", requireAuth, videoCallController.getVideoCallStatus);
router.post("/complete/:bookingId", requireAuth, videoCallController.completeVideoCall);

module.exports = router;

