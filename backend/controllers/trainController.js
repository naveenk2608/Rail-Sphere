const db = require("../db");
const { calculateFare, isValidType, listClasses, getClass } = require("../config/coachClasses");

const DAY_MAP = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// Parsed as UTC components so the weekday never shifts with the server timezone.
function dayOfWeek(dateStr) {
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const utc = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(utc.getTime())) return null;
  return DAY_MAP[utc.getUTCDay()];
}

// GET /api/trains/classes
function getClasses(req, res) {
  res.json(listClasses());
}

// GET /api/trains/search?fromId=1&toId=3&date=2026-07-10&class=SL
async function searchTrains(req, res) {
  try {
    const { fromId, toId, date, class: cls } = req.query;
    if (!fromId || !toId || !date)
      return res.status(400).json({ error: "fromId, toId and date required." });
    if (fromId === toId)
      return res.status(400).json({ error: "Source and destination must differ." });

    const day = dayOfWeek(date);
    if (!day) return res.status(400).json({ error: "Invalid date." });

    const classFilter = cls && cls !== "ALL" ? cls : null;
    if (classFilter && !isValidType(classFilter))
      return res.status(400).json({ error: "Invalid class." });

    const [trains] = await db.query(
      `SELECT t.train_id, t.train_number, t.train_name,
              src.seq AS from_seq, dst.seq AS to_seq,
              src.departure_time, src.departure_day_offset,
              dst.arrival_time,   dst.arrival_day_offset,
              (dst.distance_from_origin - src.distance_from_origin) AS distance
         FROM trains t
         JOIN train_routes   src ON src.train_id = t.train_id AND src.station_id = ?
         JOIN train_routes   dst ON dst.train_id = t.train_id AND dst.station_id = ?
         JOIN train_run_days trd ON trd.train_id = t.train_id AND trd.day_of_week = ?
        WHERE src.seq < dst.seq
        ORDER BY src.departure_time`,
      [fromId, toId, day]
    );
    if (!trains.length) return res.json([]);

    // One query for every train's coaches, rather than one query per train.
    const trainIds = trains.map((t) => t.train_id);
    const params = [fromId, toId, date, trainIds];
    const [coaches] = await db.query(
      `SELECT c.train_id, c.coach_id, c.coach_type, c.total_seats,
              COUNT(sb.seat_booking_id) AS booked_seats
         FROM coaches c
         JOIN train_routes src ON src.train_id = c.train_id AND src.station_id = ?
         JOIN train_routes dst ON dst.train_id = c.train_id AND dst.station_id = ?
         LEFT JOIN seat_bookings sb
                ON sb.coach_id     = c.coach_id
               AND sb.journey_date = ?
               AND sb.status       = 'CONFIRMED'
               AND sb.from_seq     < dst.seq
               AND sb.to_seq       > src.seq
        WHERE c.train_id IN (?) ${classFilter ? "AND c.coach_type = ?" : ""}
        GROUP BY c.train_id, c.coach_id, c.coach_type, c.total_seats`,
      classFilter ? [...params, classFilter] : params
    );

    const byTrain = new Map();
    for (const coach of coaches) {
      const key = String(coach.train_id);
      if (!byTrain.has(key)) byTrain.set(key, new Map());
      const classMap = byTrain.get(key);
      const current = classMap.get(coach.coach_type) || { total: 0, booked: 0 };
      current.total += coach.total_seats;
      current.booked += Number(coach.booked_seats);
      classMap.set(coach.coach_type, current);
    }

    const result = trains.map((train) => {
      const classMap = byTrain.get(String(train.train_id)) || new Map();
      const classes = [...classMap.entries()]
        .map(([coach_type, counts]) => {
          const meta = getClass(coach_type);
          return {
            coach_type,
            label: meta.label,
            seats_per_row: meta.seatsPerRow,
            sort_order: meta.sortOrder,
            available_seats: Math.max(0, counts.total - counts.booked),
            fare_per_person: calculateFare(train.distance, coach_type, 1).total,
          };
        })
        .sort((a, b) => a.sort_order - b.sort_order);

      return {
        train_id: train.train_id,
        train_number: train.train_number,
        train_name: train.train_name,
        from_seq: train.from_seq,
        to_seq: train.to_seq,
        departure_time: train.departure_time,
        departure_day_offset: train.departure_day_offset,
        arrival_time: train.arrival_time,
        arrival_day_offset: train.arrival_day_offset,
        distance: train.distance,
        classes,
      };
    });

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
    if (cls && cls !== "ALL" && !isValidType(cls))
      return res.status(400).json({ error: "Invalid class." });

    const filter = cls && cls !== "ALL" ? "AND coach_type = ?" : "";
    const params = cls && cls !== "ALL" ? [trainId, cls] : [trainId];

    const [coaches] = await db.query(
      `SELECT coach_id, coach_number, coach_type, total_seats
         FROM coaches WHERE train_id = ? ${filter}
        ORDER BY coach_type, coach_number`,
      params
    );

    res.json(coaches.map((c) => ({ ...c, seats_per_row: getClass(c.coach_type).seatsPerRow })));
  } catch (err) {
    console.error("getCoaches error:", err);
    res.status(500).json({ error: "Failed to fetch coaches." });
  }
}

// GET /api/trains/:trainId/seats?coachId=3&date=2026-07-10&fromSeq=1&toSeq=3
async function getBookedSeats(req, res) {
  try {
    const { trainId } = req.params;
    const { coachId, date, fromSeq, toSeq } = req.query;
    if (!coachId || !date || !fromSeq || !toSeq)
      return res.status(400).json({ error: "coachId, date, fromSeq, toSeq required." });

    const [rows] = await db.query(
      `SELECT sb.seat_no
         FROM seat_bookings sb
         JOIN coaches c ON c.coach_id = sb.coach_id
        WHERE sb.coach_id     = ?
          AND c.train_id      = ?
          AND sb.journey_date = ?
          AND sb.status       = 'CONFIRMED'
          AND sb.from_seq     < ?
          AND sb.to_seq       > ?`,
      [coachId, trainId, date, toSeq, fromSeq]
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
    const [rows] = await db.query(
      `SELECT tr.seq, tr.arrival_time, tr.departure_time,
              tr.arrival_day_offset, tr.departure_day_offset,
              tr.distance_from_origin,
              s.station_id, s.station_code, s.station_name
         FROM train_routes tr
         JOIN stations s ON s.station_id = tr.station_id
        WHERE tr.train_id = ?
        ORDER BY tr.seq`,
      [req.params.trainId]
    );
    res.json(rows);
  } catch (err) {
    console.error("getTrainRoute error:", err);
    res.status(500).json({ error: "Failed to fetch route." });
  }
}

// GET /api/trains/fare?distance=300&class=SL&passengers=2
function getFare(req, res) {
  const { distance, class: cls, passengers } = req.query;

  const km = Number(distance);
  const pax = passengers === undefined ? 1 : Number(passengers);
  if (!Number.isFinite(km) || km < 0)
    return res.status(400).json({ error: "distance must be a non-negative number." });
  if (!Number.isInteger(pax) || pax < 1)
    return res.status(400).json({ error: "passengers must be a positive integer." });
  if (!isValidType(cls))
    return res.status(400).json({ error: "Invalid class." });

  res.json(calculateFare(km, cls, pax));
}

module.exports = {
  searchTrains, getCoaches, getBookedSeats, getTrainRoute, getFare, getClasses,
};
