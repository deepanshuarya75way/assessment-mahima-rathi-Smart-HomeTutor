const express = require("express");
const router = express.Router();
const{switchDevice} = require("../controllers/deviceController");
const {requireAuth} = require("../middleware/authMiddleware");

router.post("/switch",requireAuth,switchDevice);

module.exports = router;