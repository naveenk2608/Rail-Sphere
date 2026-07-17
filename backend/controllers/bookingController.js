const db                = require("../db");
const { generatePNR }   = require("../utils/pnrGenerator");
const { sendTicketEmail } = require("../utils/mailer");

const FARE_RATES = { SL: 0.46, "3A": 1.15, "2A": 1.63, "1A": 3.07 };
const RESERVATION_CHARGE = 30;
const GST_RATE = 0.05;

function calcTotal(distance, coachType, numPassengers) {
  const rate     = FARE_RATES[coachType] || 0.46;
  const base     = Math.round(distance * rate * numPassengers);
  const resCharge = RESERVATION_CHARGE * numPassengers;
  const gst      = Math.round((base + resCharge) * GST_RATE);
  return parseFloat((base + resCharge + gst).toFixed(2));
}

// POST /api/bookings
async function createBooking(req, res) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      train_id,
      journey_date,
      source_station_id,
      destination_station_id,
      from_seq,
      to_seq,
      distance,
      coach_type,
      seats,
      passengers,
    } = req.body;

    const user_id = req.user.user_id;

    if (!seats || !passengers || seats.length !== passengers.length)
      return res.status(400).json({ error: "Seats and passengers count must match." });
    if (seats.length > 5)
      return res.status(400).json({ error: "Maximum 5 seats per booking." });

    // --- NEW: block booking a train that has already departed ---
    const [routeRows] = await conn.query(
      `SELECT departure_time FROM train_routes
       WHERE train_id = ? AND station_id = ?`,
      [train_id, source_station_id]
    );
    if (!routeRows.length) {
      await conn.rollback();
      return res.status(400).json({ error: "Invalid train/source station." });
    }

    const departureTime = routeRows[0].departure_time; // e.g. "10:07:00"
    const journeyDateTime = new Date(`${journey_date}T${departureTime}`);
    if (journeyDateTime <= new Date()) {
      await conn.rollback();
      return res.status(400).json({ error: "This train has already departed. Please choose a future date." });
    }

    // Re-verify seats are still available (double check)
    for (const seat of seats) {
      const [conflict] = await conn.query(
        `SELECT seat_booking_id FROM seat_bookings
         WHERE coach_id     = ?
           AND seat_no      = ?
           AND journey_date = ?
           AND status       = 'CONFIRMED'
           AND from_seq     < ?
           AND to_seq       > ?`,
        [seat.coach_id, seat.seat_no, journey_date, to_seq, from_seq]
      );
      if (conflict.length > 0) {
        await conn.rollback();
        return res.status(409).json({ error: `Seat ${seat.seat_no} just got booked. Please re-select.` });
      }
    }

    const total_amount = calcTotal(distance, coach_type, passengers.length);
    const pnr          = generatePNR();

    // 1. Insert booking
    const [bookingResult] = await conn.query(
      `INSERT INTO bookings
         (user_id, train_id, journey_date, source_station_id,
          destination_station_id, total_amount, pnr)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, train_id, journey_date, source_station_id,
       destination_station_id, total_amount, pnr]
    );
    const booking_id = bookingResult.insertId;

    // 2 + 3 + 4. Insert seat_bookings, booking_passengers, passenger_seat_map
    for (let i = 0; i < passengers.length; i++) {
      const seat = seats[i];
      const pax  = passengers[i];

      // seat_booking
      const [sbResult] = await conn.query(
        `INSERT INTO seat_bookings
           (booking_id, train_id, coach_id, seat_no,
            from_station_id, to_station_id, from_seq, to_seq, journey_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [booking_id, train_id, seat.coach_id, seat.seat_no,
         source_station_id, destination_station_id, from_seq, to_seq, journey_date]
      );
      const seat_booking_id = sbResult.insertId;

      // booking_passenger
      const [paxResult] = await conn.query(
        `INSERT INTO booking_passengers (booking_id, passenger_name, age, gender)
         VALUES (?, ?, ?, ?)`,
        [booking_id, pax.passenger_name, pax.age, pax.gender]
      );
      const passenger_id = paxResult.insertId;

      // passenger_seat_map
      await conn.query(
        `INSERT INTO passenger_seat_map (passenger_id, seat_booking_id)
         VALUES (?, ?)`,
        [passenger_id, seat_booking_id]
      );

      // Auto-save passenger to saved_passengers if not already saved
      const [exists] = await conn.query(
        `SELECT saved_passenger_id FROM saved_passengers
         WHERE user_id = ? AND passenger_name = ? AND age = ?`,
        [user_id, pax.passenger_name, pax.age]
      );
      if (!exists.length) {
        await conn.query(
          `INSERT INTO saved_passengers (user_id, passenger_name, age, gender)
           VALUES (?, ?, ?, ?)`,
          [user_id, pax.passenger_name, pax.age, pax.gender]
        );
      }
    }

    await conn.commit();
    res.status(201).json({ booking_id, pnr });
  } catch (err) {
    await conn.rollback();
    console.error("createBooking error:", err);
    res.status(500).json({ error: "Booking failed. Please try again." });
  } finally {
    conn.release();
  }
}

// GET /api/bookings/my
async function getMyBookings(req, res) {
  try {
    const user_id = req.user.user_id;
    const [rows] = await db.query(
      `SELECT b.booking_id, ANY_VALUE(b.pnr) AS pnr, ANY_VALUE(b.journey_date) AS journey_date,
              ANY_VALUE(b.total_amount) AS total_amount,
              ANY_VALUE(b.booking_status) AS booking_status, ANY_VALUE(b.created_at) AS created_at,
              ANY_VALUE(t.train_number) AS train_number, ANY_VALUE(t.train_name) AS train_name,
              ANY_VALUE(ss.station_name) AS source_name, ANY_VALUE(ss.station_code) AS source_code,
              ANY_VALUE(ds.station_name) AS dest_name,   ANY_VALUE(ds.station_code) AS dest_code,
              ANY_VALUE(tr_src.departure_time) AS departure_time,
              ANY_VALUE(tr_dst.arrival_time) AS arrival_time,
              COUNT(bp.passenger_id) AS passenger_count,
              MIN(c.coach_type) AS coach_type
       FROM bookings b
       JOIN trains        t      ON t.train_id      = b.train_id
       JOIN stations      ss     ON ss.station_id   = b.source_station_id
       JOIN stations      ds     ON ds.station_id   = b.destination_station_id
       JOIN train_routes  tr_src ON tr_src.train_id = b.train_id AND tr_src.station_id = b.source_station_id
       JOIN train_routes  tr_dst ON tr_dst.train_id = b.train_id AND tr_dst.station_id = b.destination_station_id
       LEFT JOIN booking_passengers bp ON bp.booking_id = b.booking_id
       LEFT JOIN seat_bookings sb ON sb.booking_id = b.booking_id
       LEFT JOIN coaches c ON c.coach_id = sb.coach_id
       WHERE b.user_id = ?
       GROUP BY b.booking_id
       ORDER BY journey_date DESC`,
      [user_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("getMyBookings error:", err);
    res.status(500).json({ error: "Failed to fetch bookings." });
  }
}
// GET /api/bookings/:bookingId
async function getBookingById(req, res) {
  try {
    const { bookingId } = req.params;

    const [bookings] = await db.query(
      `SELECT b.booking_id, b.pnr, b.journey_date, b.total_amount,
              b.booking_status, b.created_at,
              t.train_id, t.train_number, t.train_name,
              ss.station_name AS source_name, ss.station_code AS source_code,
              ds.station_name AS dest_name,   ds.station_code AS dest_code,
              tr_src.departure_time,
              tr_dst.arrival_time,
              (tr_dst.distance_from_origin - tr_src.distance_from_origin) AS distance
       FROM bookings b
       JOIN trains        t      ON t.train_id      = b.train_id
       JOIN stations      ss     ON ss.station_id   = b.source_station_id
       JOIN stations      ds     ON ds.station_id   = b.destination_station_id
       JOIN train_routes  tr_src ON tr_src.train_id = b.train_id AND tr_src.station_id = b.source_station_id
       JOIN train_routes  tr_dst ON tr_dst.train_id = b.train_id AND tr_dst.station_id = b.destination_station_id
       WHERE b.booking_id = ?`,
      [bookingId]
    );
    if (!bookings.length)
      return res.status(404).json({ error: "Booking not found." });

    const booking = bookings[0];

    const [passengers] = await db.query(
      `SELECT bp.passenger_id, bp.passenger_name, bp.age, bp.gender,
              c.coach_number, c.coach_type, sb.seat_no
       FROM booking_passengers bp
       JOIN passenger_seat_map psm ON psm.passenger_id    = bp.passenger_id
       JOIN seat_bookings      sb  ON sb.seat_booking_id  = psm.seat_booking_id
       JOIN coaches            c   ON c.coach_id          = sb.coach_id
       WHERE bp.booking_id = ?`,
      [bookingId]
    );

    res.json({ ...booking, passengers });
  } catch (err) {
    console.error("getBookingById error:", err);
    res.status(500).json({ error: "Failed to fetch booking." });
  }
}

// GET /api/bookings/pnr/:pnr  — public
async function getByPNR(req, res) {
  try {
    const { pnr } = req.params;

    const [bookings] = await db.query(
      `SELECT b.booking_id, b.pnr, b.journey_date, b.total_amount, b.booking_status,
              t.train_number, t.train_name,
              ss.station_name AS source_name, ss.station_code AS source_code,
              ds.station_name AS dest_name,   ds.station_code AS dest_code,
              tr_src.departure_time,
              tr_dst.arrival_time
       FROM bookings b
       JOIN trains        t      ON t.train_id      = b.train_id
       JOIN stations      ss     ON ss.station_id   = b.source_station_id
       JOIN stations      ds     ON ds.station_id   = b.destination_station_id
       JOIN train_routes  tr_src ON tr_src.train_id = b.train_id AND tr_src.station_id = b.source_station_id
       JOIN train_routes  tr_dst ON tr_dst.train_id = b.train_id AND tr_dst.station_id = b.destination_station_id
       WHERE b.pnr = ?`,
      [pnr]
    );
    if (!bookings.length)
      return res.status(404).json({ error: "PNR not found." });

    const booking = bookings[0];

    const [passengers] = await db.query(
      `SELECT bp.passenger_name, bp.age, bp.gender,
              c.coach_number, c.coach_type, sb.seat_no
       FROM booking_passengers bp
       JOIN passenger_seat_map psm ON psm.passenger_id   = bp.passenger_id
       JOIN seat_bookings      sb  ON sb.seat_booking_id = psm.seat_booking_id
       JOIN coaches            c   ON c.coach_id         = sb.coach_id
       WHERE bp.booking_id = ?`,
      [booking.booking_id]
    );

    res.json({ ...booking, passengers });
  } catch (err) {
    console.error("getByPNR error:", err);
    res.status(500).json({ error: "PNR lookup failed." });
  }
}

// PATCH /api/bookings/:bookingId/cancel
async function cancelBooking(req, res) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { bookingId } = req.params;
    const user_id       = req.user.user_id;

    const [rows] = await conn.query(
      `SELECT booking_id, booking_status, user_id FROM bookings WHERE booking_id = ?`,
      [bookingId]
    );
    if (!rows.length)
      return res.status(404).json({ error: "Booking not found." });
    if (rows[0].user_id !== user_id)
      return res.status(403).json({ error: "Not your booking." });
    if (rows[0].booking_status === "CANCELLED")
      return res.status(400).json({ error: "Already cancelled." });

    await conn.query(
      `UPDATE bookings SET booking_status = 'CANCELLED' WHERE booking_id = ?`,
      [bookingId]
    );
    await conn.query(
      `UPDATE seat_bookings SET status = 'CANCELLED' WHERE booking_id = ?`,
      [bookingId]
    );

    await conn.commit();
    res.json({ message: "Booking cancelled successfully." });
  } catch (err) {
    await conn.rollback();
    console.error("cancelBooking error:", err);
    res.status(500).json({ error: "Cancellation failed." });
  } finally {
    conn.release();
  }
}

// POST /api/bookings/:bookingId/email
async function emailTicket(req, res) {
  try {
    const { bookingId } = req.params;
    const user_id       = req.user.user_id;

    const [userRows] = await db.query(
      `SELECT email FROM users WHERE user_id = ?`, [user_id]
    );
    if (!userRows.length)
      return res.status(404).json({ error: "User not found." });

    // Reuse getBookingById logic
    const [bookings] = await db.query(
      `SELECT b.pnr, b.journey_date, b.total_amount,
              t.train_number, t.train_name,
              ss.station_name AS source_station_name, ss.station_code AS source_code,
              ds.station_name AS destination_station_name, ds.station_code AS dest_code,
              tr_src.departure_time, tr_dst.arrival_time
       FROM bookings b
       JOIN trains        t      ON t.train_id      = b.train_id
       JOIN stations      ss     ON ss.station_id   = b.source_station_id
       JOIN stations      ds     ON ds.station_id   = b.destination_station_id
       JOIN train_routes  tr_src ON tr_src.train_id = b.train_id AND tr_src.station_id = b.source_station_id
       JOIN train_routes  tr_dst ON tr_dst.train_id = b.train_id AND tr_dst.station_id = b.destination_station_id
       WHERE b.booking_id = ? AND b.user_id = ?`,
      [bookingId, user_id]
    );
    if (!bookings.length)
      return res.status(404).json({ error: "Booking not found." });

    const [passengers] = await db.query(
      `SELECT bp.passenger_name, bp.age, bp.gender, c.coach_number, sb.seat_no
       FROM booking_passengers bp
       JOIN passenger_seat_map psm ON psm.passenger_id   = bp.passenger_id
       JOIN seat_bookings      sb  ON sb.seat_booking_id = psm.seat_booking_id
       JOIN coaches            c   ON c.coach_id         = sb.coach_id
       WHERE bp.booking_id = ?`,
      [bookingId]
    );

    await sendTicketEmail(userRows[0].email, { ...bookings[0], passengers });
    res.json({ message: "Ticket sent to " + userRows[0].email });
  } catch (err) {
    console.error("emailTicket error:", err);
    res.status(500).json({ error: "Failed to send email." });
  }
}

module.exports = {
  createBooking, getMyBookings, getBookingById,
  getByPNR, cancelBooking, emailTicket,
};