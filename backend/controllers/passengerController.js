const db = require("../db");

const SUGGESTION_LIMIT = 10;

// GET /api/passengers/saved
// Derived from booking history rather than a stored table: every field was
// already a copy of something in seat_bookings, and a derived list cannot
// drift from what the user actually booked.
async function getSavedPassengers(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT sb.passenger_name, sb.age, sb.gender,
              MAX(b.created_at) AS last_used
         FROM seat_bookings sb
         JOIN bookings b ON b.booking_id = sb.booking_id
        WHERE b.user_id = ?
        GROUP BY sb.passenger_name, sb.age, sb.gender
        ORDER BY last_used DESC
        LIMIT ${SUGGESTION_LIMIT}`,
      [req.user.user_id]
    );

    res.json(
      rows.map((r) => ({
        id: `${r.passenger_name}|${r.age}|${r.gender ?? ""}`,
        passenger_name: r.passenger_name,
        age: r.age,
        gender: r.gender,
      }))
    );
  } catch (err) {
    console.error("getSavedPassengers error:", err);
    res.status(500).json({ error: "Failed to fetch saved passengers." });
  }
}

module.exports = { getSavedPassengers };
