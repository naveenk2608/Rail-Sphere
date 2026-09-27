const db = require("../db");

async function searchStations(req, res) {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q.length < 2) return res.json([]);
    // Treat % and _ as literal characters, not LIKE wildcards.
    const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;

    const [rows] = await db.query(
      `SELECT station_id, station_code, station_name
       FROM stations
       WHERE station_name LIKE ? OR station_code LIKE ?
       ORDER BY station_name
       LIMIT 8`,
      [pattern, pattern]
    );
    res.json(rows);
  } catch (err) {
    console.error("searchStations error:", err);
    res.status(500).json({ error: "Failed to search stations." });
  }
}

module.exports = { searchStations };