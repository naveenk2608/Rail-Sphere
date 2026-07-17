const express = require("express");
const router  = express.Router();
const { searchStations } = require("../controllers/stationController");

router.get("/search", searchStations);

module.exports = router;