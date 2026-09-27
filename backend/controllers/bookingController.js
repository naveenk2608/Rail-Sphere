const db = require("../db");
const { generatePNR } = require("../utils/pnrGenerator");
const { sendTicketEmail } = require("../utils/mailer");
const { calculateFare, isValidType, MAX_SEATS_PER_BOOKING } = require("../config/coachClasses");
const { isValidDate, dayOfWeek, departureInstant } = require("../utils/dates");

const PNR_ATTEMPTS = 5;

// InnoDB aborts one side of a lock cycle rather than letting both wait.
// Either way the other booking won the seats, so the client should re-select.
const LOCK_ERRORS = new Set(["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"]);

function validatePassenger(p) {
  if (!p || typeof p.passenger_name !== "string" || !p.passenger_name.trim())
    return "Passenger name is required.";
  if (p.passenger_name.trim().length > 100)
    return "Passenger name is too long.";
  const age = Number(p.age);
  if (!Number.isInteger(age) || age < 1 || age > 120)
    return "Passenger age must be between 1 and 120.";
  if (!["M", "F", "OTHER"].includes(p.gender))
    return "Passenger gender is required.";
  return null;
}

// POST /api/bookings
// journey_date is the train's run date at its origin, as returned by search.
async function createBooking(req, res) {
  const {
    train_id,
    journey_date,
    source_station_id,
    destination_station_id,
    coach_type,
    seats,
    passengers,
  } = req.body;
  const user_id = req.user.user_id;

  // Validate before opening a transaction, so no early return can leave one dangling.
  if (!Array.isArray(seats) || !Array.isArray(passengers))
    return res.status(400).json({ error: "Seats and passengers must be arrays." });
  if (seats.length === 0)
    return res.status(400).json({ error: "At least one seat is required." });
  if (seats.length !== passengers.length)
    return res.status(400).json({ error: "Seats and passengers count must match." });
  if (seats.length > MAX_SEATS_PER_BOOKING)
    return res.status(400).json({ error: `Maximum ${MAX_SEATS_PER_BOOKING} seats per booking.` });
  if (!isValidType(coach_type))
    return res.status(400).json({ error: "Invalid coach type." });
  if (!isValidDate(journey_date))
    return res.status(400).json({ error: "Invalid journey date." });
  if (String(source_station_id) === String(destination_station_id))
    return res.status(400).json({ error: "Source and destination must differ." });

  for (const p of passengers) {
    const problem = validatePassenger(p);
    if (problem) return res.status(400).json({ error: problem });
  }

  const seatList = [];
  const seen = new Set();
  for (const s of seats) {
    const coach_id = Number(s?.coach_id);
    const seat_no = Number(s?.seat_no);
    if (!Number.isInteger(coach_id) || !Number.isInteger(seat_no))
      return res.status(400).json({ error: "Each seat needs a coach_id and seat_no." });
    const key = `${coach_id}-${seat_no}`;
    if (seen.has(key))
      return res.status(400).json({ error: "The same seat was selected twice." });
    seen.add(key);
    seatList.push({ coach_id, seat_no });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Route facts come from the database. Anything the client sent about
    // distance or sequence numbers is ignored — it determines the price.
    const [routeRows] = await conn.query(
      `SELECT station_id, seq, distance_from_origin, departure_time, departure_day_offset
         FROM train_routes
        WHERE train_id = ? AND station_id IN (?, ?)`,
      [train_id, source_station_id, destination_station_id]
    );

    const src = routeRows.find((r) => String(r.station_id) === String(source_station_id));
    const dst = routeRows.find((r) => String(r.station_id) === String(destination_station_id));
    if (!src || !dst) {
      await conn.rollback();
      return res.status(400).json({ error: "This train does not serve both stations." });
    }
    if (src.seq >= dst.seq) {
      await conn.rollback();
      return res.status(400).json({ error: "Destination must come after source on this route." });
    }

    const [runs] = await conn.query(
      `SELECT 1 FROM train_run_days WHERE train_id = ? AND day_of_week = ?`,
      [train_id, dayOfWeek(journey_date)]
    );
    if (!runs.length) {
      await conn.rollback();
      return res.status(400).json({ error: "This train does not run on that date." });
    }

    const from_seq = src.seq;
    const to_seq = dst.seq;
    const distance = dst.distance_from_origin - src.distance_from_origin;

    const departsAt = departureInstant(journey_date, src.departure_time, src.departure_day_offset);
    if (!departsAt) {
      await conn.rollback();
      return res.status(400).json({ error: "This train has no departure time for that station." });
    }
    if (departsAt <= new Date()) {
      await conn.rollback();
      return res.status(400).json({ error: "This train has already departed. Please choose a future date." });
    }

    // Lock the coach rows first. Every booking for these coaches queues here,
    // in coach_id order, so two bookings can never hold gap locks on the same
    // seat range and deadlock each other on INSERT. The lock is per coach, so
    // bookings in other coaches or other trains are unaffected.
    const coachIds = [...new Set(seatList.map((s) => s.coach_id))].sort((a, b) => a - b);
    const [coaches] = await conn.query(
      `SELECT coach_id, coach_type, total_seats
         FROM coaches
        WHERE train_id = ? AND coach_id IN (?)
        ORDER BY coach_id
          FOR UPDATE`,
      [train_id, coachIds]
    );
    const coachById = new Map(coaches.map((c) => [c.coach_id, c]));

    for (const seat of seatList) {
      const coach = coachById.get(seat.coach_id);
      if (!coach) {
        await conn.rollback();
        return res.status(400).json({ error: "Selected coach does not belong to this train." });
      }
      if (coach.coach_type !== coach_type) {
        await conn.rollback();
        return res.status(400).json({ error: "Selected coach does not match the chosen class." });
      }
      if (seat.seat_no < 1 || seat.seat_no > coach.total_seats) {
        await conn.rollback();
        return res.status(400).json({ error: `Seat ${seat.seat_no} does not exist in that coach.` });
      }
    }

    // A locking read, so it sees rows committed by a booking that held the
    // coach lock before us — a plain SELECT would read this transaction's
    // older snapshot and miss them.
    for (const seat of seatList) {
      const [conflict] = await conn.query(
        `SELECT seat_booking_id FROM seat_bookings
          WHERE coach_id     = ?
            AND seat_no      = ?
            AND journey_date = ?
            AND status       = 'CONFIRMED'
            AND from_seq     < ?
            AND to_seq       > ?
          FOR UPDATE`,
        [seat.coach_id, seat.seat_no, journey_date, to_seq, from_seq]
      );
      if (conflict.length > 0) {
        await conn.rollback();
        return res.status(409).json({ error: `Seat ${seat.seat_no} was just booked. Please re-select.` });
      }
    }

    const fare = calculateFare(distance, coach_type, passengers.length);

    let booking_id = null;
    let pnr = null;
    for (let attempt = 0; attempt < PNR_ATTEMPTS; attempt++) {
      const candidate = generatePNR();
      try {
        const [result] = await conn.query(
          `INSERT INTO bookings
             (user_id, train_id, journey_date, source_station_id,
              destination_station_id, coach_type, total_amount, pnr)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [user_id, train_id, journey_date, source_station_id,
           destination_station_id, coach_type, fare.total, candidate]
        );
        booking_id = result.insertId;
        pnr = candidate;
        break;
      } catch (err) {
        if (err.code !== "ER_DUP_ENTRY") throw err;
      }
    }
    if (!booking_id) {
      await conn.rollback();
      return res.status(503).json({ error: "Could not allocate a PNR. Please try again." });
    }

    for (let i = 0; i < passengers.length; i++) {
      const seat = seatList[i];
      const pax = passengers[i];
      await conn.query(
        `INSERT INTO seat_bookings
           (booking_id, coach_id, seat_no, from_seq, to_seq, journey_date,
            passenger_name, age, gender)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [booking_id, seat.coach_id, seat.seat_no, from_seq, to_seq, journey_date,
         pax.passenger_name.trim(), Number(pax.age), pax.gender]
      );
    }

    await conn.commit();
    res.status(201).json({ booking_id, pnr });
  } catch (err) {
    await conn.rollback();
    if (LOCK_ERRORS.has(err.code))
      return res.status(409).json({ error: "Those seats were just booked by someone else. Please re-select." });
    console.error("createBooking error:", err);
    res.status(500).json({ error: "Booking failed. Please try again." });
  } finally {
    conn.release();
  }
}

// GET /api/bookings/my
async function getMyBookings(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT b.booking_id, b.pnr, b.journey_date, b.total_amount,
              b.booking_status, b.created_at, b.coach_type,
              t.train_number, t.train_name,
              ss.station_name AS source_name, ss.station_code AS source_code,
              ds.station_name AS dest_name,   ds.station_code AS dest_code,
              tr_src.departure_time, tr_src.departure_day_offset,
              tr_dst.arrival_time,   tr_dst.arrival_day_offset,
              (SELECT COUNT(*) FROM seat_bookings sb
                WHERE sb.booking_id = b.booking_id) AS passenger_count
         FROM bookings b
         JOIN trains       t      ON t.train_id      = b.train_id
         JOIN stations     ss     ON ss.station_id   = b.source_station_id
         JOIN stations     ds     ON ds.station_id   = b.destination_station_id
         JOIN train_routes tr_src ON tr_src.train_id = b.train_id
                                 AND tr_src.station_id = b.source_station_id
         JOIN train_routes tr_dst ON tr_dst.train_id = b.train_id
                                 AND tr_dst.station_id = b.destination_station_id
        WHERE b.user_id = ?
        ORDER BY b.journey_date DESC, b.booking_id DESC`,
      [req.user.user_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("getMyBookings error:", err);
    res.status(500).json({ error: "Failed to fetch bookings." });
  }
}

const BOOKING_DETAIL_SQL = `
  SELECT b.booking_id, b.pnr, b.journey_date, b.total_amount,
         b.booking_status, b.created_at, b.coach_type,
         t.train_id, t.train_number, t.train_name,
         ss.station_name AS source_name, ss.station_code AS source_code,
         ds.station_name AS dest_name,   ds.station_code AS dest_code,
         tr_src.departure_time, tr_src.departure_day_offset,
         tr_dst.arrival_time,   tr_dst.arrival_day_offset,
         (tr_dst.distance_from_origin - tr_src.distance_from_origin) AS distance
    FROM bookings b
    JOIN trains       t      ON t.train_id      = b.train_id
    JOIN stations     ss     ON ss.station_id   = b.source_station_id
    JOIN stations     ds     ON ds.station_id   = b.destination_station_id
    JOIN train_routes tr_src ON tr_src.train_id = b.train_id
                            AND tr_src.station_id = b.source_station_id
    JOIN train_routes tr_dst ON tr_dst.train_id = b.train_id
                            AND tr_dst.station_id = b.destination_station_id
`;

// Passengers and seats are one table now, so this is a single join.
const PASSENGER_SQL = `
  SELECT sb.seat_booking_id, sb.passenger_name, sb.age, sb.gender,
         sb.seat_no, sb.status,
         c.coach_number, c.coach_type
    FROM seat_bookings sb
    JOIN coaches c ON c.coach_id = sb.coach_id
   WHERE sb.booking_id = ?
   ORDER BY sb.seat_booking_id
`;

// GET /api/bookings/:bookingId
async function getBookingById(req, res) {
  try {
    const { bookingId } = req.params;

    const [bookings] = await db.query(
      `${BOOKING_DETAIL_SQL} WHERE b.booking_id = ? AND b.user_id = ?`,
      [bookingId, req.user.user_id]
    );
    if (!bookings.length)
      return res.status(404).json({ error: "Booking not found." });

    const [passengers] = await db.query(PASSENGER_SQL, [bookingId]);
    res.json({ ...bookings[0], passengers });
  } catch (err) {
    console.error("getBookingById error:", err);
    res.status(500).json({ error: "Failed to fetch booking." });
  }
}

// GET /api/bookings/pnr/:pnr — public
async function getByPNR(req, res) {
  try {
    const { pnr } = req.params;
    if (!/^\d{12}$/.test(pnr))
      return res.status(400).json({ error: "PNR must be 12 digits." });

    const [bookings] = await db.query(`${BOOKING_DETAIL_SQL} WHERE b.pnr = ?`, [pnr]);
    if (!bookings.length)
      return res.status(404).json({ error: "PNR not found." });

    const [passengers] = await db.query(PASSENGER_SQL, [bookings[0].booking_id]);
    res.json({ ...bookings[0], passengers });
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

    const [rows] = await conn.query(
      `SELECT b.booking_id, b.booking_status, b.journey_date,
              tr.departure_time, tr.departure_day_offset
         FROM bookings b
         JOIN train_routes tr ON tr.train_id = b.train_id
                             AND tr.station_id = b.source_station_id
        WHERE b.booking_id = ? AND b.user_id = ?
        FOR UPDATE`,
      [bookingId, req.user.user_id]
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ error: "Booking not found." });
    }
    if (rows[0].booking_status === "CANCELLED") {
      await conn.rollback();
      return res.status(400).json({ error: "Already cancelled." });
    }

    const departsAt = departureInstant(
      rows[0].journey_date, rows[0].departure_time, rows[0].departure_day_offset
    );
    if (departsAt && departsAt <= new Date()) {
      await conn.rollback();
      return res.status(400).json({ error: "This train has already departed and cannot be cancelled." });
    }

    await conn.query(
      `UPDATE bookings
          SET booking_status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP
        WHERE booking_id = ?`,
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
    const user_id = req.user.user_id;

    const [bookings] = await db.query(
      `${BOOKING_DETAIL_SQL} WHERE b.booking_id = ? AND b.user_id = ?`,
      [bookingId, user_id]
    );
    if (!bookings.length)
      return res.status(404).json({ error: "Booking not found." });
    if (bookings[0].booking_status === "CANCELLED")
      return res.status(400).json({ error: "This booking has been cancelled." });

    const [userRows] = await db.query(
      `SELECT email FROM users WHERE user_id = ?`, [user_id]
    );
    if (!userRows.length)
      return res.status(404).json({ error: "User not found." });

    const [passengers] = await db.query(PASSENGER_SQL, [bookingId]);

    await sendTicketEmail(userRows[0].email, { ...bookings[0], passengers });
    res.json({ message: `Ticket sent to ${userRows[0].email}` });
  } catch (err) {
    console.error("emailTicket error:", err);
    res.status(500).json({ error: "Failed to send email." });
  }
}

module.exports = {
  createBooking, getMyBookings, getBookingById,
  getByPNR, cancelBooking, emailTicket,
};
