const db = require("../db");

async function searchStations(req, res) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json([]);

    const [rows] = await db.query(
      `SELECT station_id, station_code, station_name
       FROM stations
       WHERE station_name LIKE ? OR station_code LIKE ?
       ORDER BY station_name
       LIMIT 8`,
      [`%${q}%`, `%${q}%`]
    );
    res.json(rows);
  } catch (err) {
    console.error("searchStations error:", err);
    res.status(500).json({ error: "Failed to search stations." });
  }
}

module.exports = { searchStations };