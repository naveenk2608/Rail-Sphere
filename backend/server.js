require("dotenv").config();
const express = require("express");
const cors    = require("cors");

const authRoutes      = require("./routes/authRoutes");
const stationRoutes   = require("./routes/stationRoutes");
const trainRoutes     = require("./routes/trainRoutes");
const bookingRoutes   = require("./routes/bookingRoutes");
const passengerRoutes = require("./routes/passengerRoutes");

// Without this, jwt.sign throws on every signup and jwt.verify rejects every
// request — far easier to diagnose at boot than as scattered 500s.
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set. Refusing to start.");
  process.exit(1);
}

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "100kb" }));

app.use("/api/auth",       authRoutes);
app.use("/api/stations",   stationRoutes);
app.use("/api/trains",     trainRoutes);
app.use("/api/bookings",   bookingRoutes);
app.use("/api/passengers", passengerRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use((req, res) => res.status(404).json({ error: "Not found." }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
