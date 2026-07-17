const express = require("express");
const router  = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  getSavedPassengers, addSavedPassenger, deleteSavedPassenger,
} = require("../controllers/passengerController");

router.get("/saved",      authMiddleware, getSavedPassengers);
router.post("/saved",     authMiddleware, addSavedPassenger);
router.delete("/saved/:id", authMiddleware, deleteSavedPassenger);

module.exports = router;