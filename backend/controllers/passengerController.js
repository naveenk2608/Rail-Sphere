const db = require("../db");

async function getSavedPassengers(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT saved_passenger_id, passenger_name, age, gender
       FROM saved_passengers WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.user_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("getSavedPassengers error:", err);
    res.status(500).json({ error: "Failed to fetch saved passengers." });
  }
}

async function addSavedPassenger(req, res) {
  try {
    const { passenger_name, age, gender } = req.body;
    if (!passenger_name || !age)
      return res.status(400).json({ error: "Name and age required." });

    const [result] = await db.query(
      `INSERT INTO saved_passengers (user_id, passenger_name, age, gender)
       VALUES (?, ?, ?, ?)`,
      [req.user.user_id, passenger_name, age, gender || null]
    );
    res.status(201).json({ saved_passenger_id: result.insertId, passenger_name, age, gender });
  } catch (err) {
    console.error("addSavedPassenger error:", err);
    res.status(500).json({ error: "Failed to save passenger." });
  }
}

async function deleteSavedPassenger(req, res) {
  try {
    const { id } = req.params;
    const [result] = await db.query(
      `DELETE FROM saved_passengers
       WHERE saved_passenger_id = ? AND user_id = ?`,
      [id, req.user.user_id]
    );
    if (!result.affectedRows)
      return res.status(404).json({ error: "Passenger not found." });
    res.json({ message: "Deleted." });
  } catch (err) {
    console.error("deleteSavedPassenger error:", err);
    res.status(500).json({ error: "Failed to delete passenger." });
  }
}

module.exports = { getSavedPassengers, addSavedPassenger, deleteSavedPassenger };