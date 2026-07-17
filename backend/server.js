require("dotenv").config();
const express  = require("express");
const cors     = require("cors");

const authRoutes      = require("./routes/authRoutes");
const stationRoutes   = require("./routes/stationRoutes");
const trainRoutes     = require("./routes/trainRoutes");
const bookingRoutes   = require("./routes/bookingRoutes");
const passengerRoutes = require("./routes/passengerRoutes");

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

// Routes
app.use("/api/auth",       authRoutes);
app.use("/api/stations",   stationRoutes);
app.use("/api/trains",     trainRoutes);
app.use("/api/bookings",   bookingRoutes);
app.use("/api/passengers", passengerRoutes);

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));