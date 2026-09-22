const db = require("../db");
const { generatePNR } = require("../utils/pnrGenerator");
const { sendTicketEmail } = require("../utils/mailer");
const { calculateFare, isValidType } = require("../config/coachClasses");

const MAX_SEATS_PER_BOOKING = 5;
const PNR_ATTEMPTS = 5;

// Timetable times are Indian Railways local time. Pinning the offset keeps the
// "already departed" check identical regardless of the server's timezone.
const IST_OFFSET = "+05:30";

function departureInstant(journeyDate, departureTime, dayOffset) {
  if (!departureTime) return null;
  const date = String(journeyDate).slice(0, 10);
  const instant = new Date(`${date}T${departureTime}${IST_OFFSET}`);
  if (Number.isNaN(instant.getTime())) return null;
  instant.setDate(instant.getDate() + (dayOffset || 0));
  return instant;
}

function validatePassenger(p) {
  if (!p || typeof p.passenger_name !== "string" || !p.passenger_name.trim())
    return "Passenger name is required.";
  const age = Number(p.age);
  if (!Number.isInteger(age) || age < 1 || age > 120)
    return "Passenger age must be between 1 and 120.";
  if (p.gender && !["M", "F", "OTHER"].includes(p.gender))
    return "Invalid gender.";
  return null;
}

// POST /api/bookings
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
  if (source_station_id === destination_station_id)
    return res.status(400).json({ error: "Source and destination must differ." });

  for (const p of passengers) {
    const problem = validatePassenger(p);
    if (problem) return res.status(400).json({ error: problem });
  }
  for (const s of seats) {
    if (!s || !Number.isInteger(Number(s.coach_id)) || !Number.isInteger(Number(s.seat_no)))
      return res.status(400).json({ error: "Each seat needs a coach_id and seat_no." });
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

    // Every seat must belong to this train, match the requested class,
    // and sit within its coach's seat count.
    const coachIds = [...new Set(seats.map((s) => Number(s.coach_id)))];
    const [coaches] = await conn.query(
      `SELECT coach_id, coach_type, total_seats
         FROM coaches
        WHERE train_id = ? AND coach_id IN (?)`,
      [train_id, coachIds]
    );
    const coachById = new Map(coaches.map((c) => [String(c.coach_id), c]));

    for (const seat of seats) {
      const coach = coachById.get(String(seat.coach_id));
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

    const seen = new Set();
    for (const seat of seats) {
      const key = `${seat.coach_id}-${seat.seat_no}`;
      if (seen.has(key)) {
        await conn.rollback();
        return res.status(400).json({ error: "The same seat was selected twice." });
      }
      seen.add(key);
    }

    // FOR UPDATE takes a gap lock over the segment range, so a concurrent
    // booking of the same seat blocks here instead of both passing the check.
    for (const seat of seats) {
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
      const seat = seats[i];
      const pax = passengers[i];
      await conn.query(
        `INSERT INTO seat_bookings
           (booking_id, coach_id, seat_no, from_seq, to_seq, journey_date,
            passenger_name, age, gender)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [booking_id, seat.coach_id, seat.seat_no, from_seq, to_seq, journey_date,
         pax.passenger_name.trim(), Number(pax.age), pax.gender || null]
      );
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
