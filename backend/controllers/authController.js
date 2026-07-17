const bcrypt = require("bcrypt");
const jwt    = require("jsonwebtoken");
const db     = require("../db");

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "All fields are required." });

    const [existing] = await db.query(
      "SELECT user_id FROM users WHERE email = ?", [email]
    );
    if (existing.length > 0)
      return res.status(400).json({ error: "Email already registered." });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [name, email, hash]
    );

    const token = signToken({ user_id: result.insertId, name, email });
    res.status(201).json({ token, user: { user_id: result.insertId, name, email } });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ error: "Registration failed." });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required." });

    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ?", [email]
    );
    if (!rows.length)
      return res.status(401).json({ error: "Email not found." });

    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid)
      return res.status(401).json({ error: "Wrong password." });

    const { user_id, name } = rows[0];
    const token = signToken({ user_id, name, email });
    res.json({ token, user: { user_id, name, email } });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ error: "Login failed." });
  }
}

module.exports = { register, login };