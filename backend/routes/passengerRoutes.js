const express = require("express");
const router  = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const { getSavedPassengers } = require("../controllers/passengerController");

router.get("/saved", authMiddleware, getSavedPassengers);

module.exports = router;
