const express = require("express");
const router  = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  createBooking, getMyBookings, getBookingById,
  getByPNR, cancelBooking, emailTicket,
} = require("../controllers/bookingController");

router.get("/pnr/:pnr",              getByPNR);                       // public
router.post("/",                     authMiddleware, createBooking);
router.get("/my",                    authMiddleware, getMyBookings);
router.get("/:bookingId",            authMiddleware, getBookingById);
router.patch("/:bookingId/cancel",   authMiddleware, cancelBooking);
router.post("/:bookingId/email",     authMiddleware, emailTicket);

module.exports = router;