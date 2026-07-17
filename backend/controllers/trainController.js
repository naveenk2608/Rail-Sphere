const db = require("../db");

const FARE_RATES = { SL: 0.46, "3A": 1.15, "2A": 1.63, "1A": 3.07 };
const RESERVATION_CHARGE = 30;
const GST_RATE = 0.05;

const DAY_MAP = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

function calcFare(distance, coachType, passengers = 1) {
  const rate     = FARE_RATES[coachType] || 0.46;
  const base     = Math.round(distance * rate);
  const resCharge = RESERVATION_CHARGE * passengers;
  const gst      = Math.round((base + resCharge) * GST_RATE);
  return { base, resCharge, gst, total: base + resCharge + gst };
}

// GET /api/trains/search?fromId=1&toId=3&date=2025-07-10&class=SL
async function searchTrains(req, res) {
  try {
    const { fromId, toId, date, class: cls } = req.query;
    if (!fromId || !toId || !date)
      return res.status(400).json({ error: "fromId, toId and date required." });

    const dayOfWeek = DAY_MAP[new Date(date).getDay()];

    // Find trains that have both stations in correct order
    const [trains] = await db.query(
      `SELECT DISTINCT t.train_id, t.train_number, t.train_name,
              src.seq       AS from_seq,
              dst.seq       AS to_seq,
              src.departure_time,
              dst.arrival_time,
              (dst.distance_from_origin - src.distance_from_origin) AS distance
       FROM trains t
       JOIN train_routes src ON src.train_id = t.train_id AND src.station_id = ?
       JOIN train_routes dst ON dst.train_id = t.train_id AND dst.station_id = ?
       JOIN train_run_days trd ON trd.train_id = t.train_id AND trd.day_of_week = ?
       WHERE src.seq < dst.seq`,
      [fromId, toId, dayOfWeek]
    );

    if (!trains.length) return res.json([]);

    const result = [];
    for (const train of trains) {
      // Get coaches grouped by type with availability
      const classFilter = cls && cls !== "ALL" ? "AND c.coach_type = ?" : "";
      const params = [train.train_id];
      if (cls && cls !== "ALL") params.push(cls);

      const [coaches] = await db.query(
        `SELECT c.coach_id, c.coach_type, c.total_seats,
                COUNT(sb.seat_booking_id) AS booked_seats
         FROM coaches c
         LEFT JOIN seat_bookings sb
           ON sb.coach_id = c.coach_id
           AND sb.train_id = c.train_id
           AND sb.journey_date = ?
           AND sb.status = 'CONFIRMED'
           AND sb.from_seq < ?
           AND sb.to_seq   > ?
         WHERE c.train_id = ? ${classFilter}
         GROUP BY c.coach_id`,
        [date, train.to_seq, train.from_seq, ...params]
      );

      // Group by class type
      const classMap = {};
      for (const coach of coaches) {
        if (!classMap[coach.coach_type]) {
          classMap[coach.coach_type] = { total: 0, booked: 0 };
        }
        classMap[coach.coach_type].total  += coach.total_seats;
        classMap[coach.coach_type].booked += Number(coach.booked_seats);
      }

      const classes = Object.entries(classMap).map(([type, counts]) => {
        const available = counts.total - counts.booked;
        const fare      = calcFare(train.distance, type, 1);
        return { coach_type: type, available_seats: available, fare_per_person: fare.total };
      });

      result.push({
        train_id:       train.train_id,
        train_number:   train.train_number,
        train_name:     train.train_name,
        from_seq:       train.from_seq,
        to_seq:         train.to_seq,
        departure_time: train.departure_time,
        arrival_time:   train.arrival_time,
        distance:       train.distance,
        classes,
      });
    }

    res.json(result);
  } catch (err) {
    console.error("searchTrains error:", err);
    res.status(500).json({ error: "Search failed." });
  }
}

// GET /api/trains/:trainId/coaches?class=SL
async function getCoaches(req, res) {
  try {
    const { trainId } = req.params;
    const { class: cls } = req.query;
    const params = [trainId];
    const filter = cls && cls !== "ALL" ? "AND coach_type = ?" : "";
    if (cls && cls !== "ALL") params.push(cls);

    const [coaches] = await db.query(
      `SELECT coach_id, coach_number, coach_type, total_seats
       FROM coaches WHERE train_id = ? ${filter}
       ORDER BY coach_type, coach_number`,
      params
    );
    res.json(coaches);
  } catch (err) {
    console.error("getCoaches error:", err);
    res.status(500).json({ error: "Failed to fetch coaches." });
  }
}

// GET /api/trains/:trainId/seats?coachId=3&date=2025-07-10&fromSeq=1&toSeq=3
async function getBookedSeats(req, res) {
  try {
    const { trainId }                       = req.params;
    const { coachId, date, fromSeq, toSeq } = req.query;
    if (!coachId || !date || !fromSeq || !toSeq)
      return res.status(400).json({ error: "coachId, date, fromSeq, toSeq required." });

    const [rows] = await db.query(
      `SELECT seat_no FROM seat_bookings
       WHERE coach_id    = ?
         AND journey_date = ?
         AND status      = 'CONFIRMED'
         AND from_seq    < ?
         AND to_seq      > ?`,
      [coachId, date, toSeq, fromSeq]
    );
    res.json(rows.map((r) => r.seat_no));
  } catch (err) {
    console.error("getBookedSeats error:", err);
    res.status(500).json({ error: "Failed to fetch seats." });
  }
}

// GET /api/trains/:trainId/route
async function getTrainRoute(req, res) {
  try {
    const { trainId } = req.params;
    const [rows] = await db.query(
      `SELECT tr.seq, tr.arrival_time, tr.departure_time,
              tr.distance_from_origin,
              s.station_id, s.station_code, s.station_name
       FROM train_routes tr
       JOIN stations s ON s.station_id = tr.station_id
       WHERE tr.train_id = ?
       ORDER BY tr.seq`,
      [trainId]
    );
    res.json(rows);
  } catch (err) {
    console.error("getTrainRoute error:", err);
    res.status(500).json({ error: "Failed to fetch route." });
  }
}

// GET /api/trains/fare?distance=300&class=SL&passengers=2
async function getFare(req, res) {
  try {
    const { distance, class: cls, passengers } = req.query;
    const fare = calcFare(Number(distance), cls, Number(passengers) || 1);
    res.json(fare);
  } catch (err) {
    res.status(500).json({ error: "Fare calculation failed." });
  }
}

module.exports = { searchTrains, getCoaches, getBookedSeats, getTrainRoute, getFare };