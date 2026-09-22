const express = require("express");
const router  = express.Router();
const {
  searchTrains, getCoaches, getBookedSeats, getTrainRoute, getFare, getClasses,
} = require("../controllers/trainController");

router.get("/search",           searchTrains);
router.get("/fare",             getFare);
router.get("/classes",          getClasses);
router.get("/:trainId/coaches", getCoaches);
router.get("/:trainId/seats",   getBookedSeats);
router.get("/:trainId/route",   getTrainRoute);

module.exports = router;
