const bcrypt = require("bcrypt");
const jwt    = require("jsonwebtoken");
const db     = require("../db");

const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
// bcrypt silently truncates beyond 72 bytes, so reject rather than mislead.
const MAX_PASSWORD_LENGTH = 72;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Compared against when no user matches, so a missing account costs the same
// time as a wrong password and can't be told apart by timing.
const DUMMY_HASH = bcrypt.hashSync("no-such-user", BCRYPT_ROUNDS);

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "All fields are required." });

    const trimmedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!trimmedName)
      return res.status(400).json({ error: "Name is required." });
    if (!EMAIL_PATTERN.test(normalizedEmail))
      return res.status(400).json({ error: "Enter a valid email address." });
    if (password.length < MIN_PASSWORD_LENGTH)
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_LENGTH)
      return res.status(400).json({ error: "Password is too long." });

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    let result;
    try {
      [result] = await db.query(
        "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
        [trimmedName, normalizedEmail, hash]
      );
    } catch (err) {
      // Let the UNIQUE constraint decide, so concurrent signups can't both pass.
      if (err.code === "ER_DUP_ENTRY")
        return res.status(409).json({ error: "Email already registered." });
      throw err;
    }

    const user = { user_id: result.insertId, name: trimmedName, email: normalizedEmail };
    res.status(201).json({ token: signToken(user), user });
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
      "SELECT user_id, name, email, password_hash FROM users WHERE email = ?",
      [String(email).trim().toLowerCase()]
    );

    // One message for both cases, so the response can't be used to discover
    // which email addresses are registered.
    const invalid = { error: "Invalid email or password." };
    if (!rows.length) {
      await bcrypt.compare(password, DUMMY_HASH);
      return res.status(401).json(invalid);
    }
    if (!(await bcrypt.compare(password, rows[0].password_hash)))
      return res.status(401).json(invalid);

    const { user_id, name, email: userEmail } = rows[0];
    const user = { user_id, name, email: userEmail };
    res.json({ token: signToken(user), user });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ error: "Login failed." });
  }
}

module.exports = { register, login };
