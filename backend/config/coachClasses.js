const config = require("./coach-classes.json");

const CLASSES = config.classes;
const RESERVATION_CHARGE = config.reservationChargePerPassenger;
const GST_RATE = config.gstRate;

function isValidType(coachType) {
  return Object.prototype.hasOwnProperty.call(CLASSES, coachType);
}

function getClass(coachType) {
  const cls = CLASSES[coachType];
  if (!cls) throw new Error(`Unknown coach type: ${coachType}`);
  return cls;
}

// Served to the client so the frontend keeps no copy of labels or rates.
// Rates are included so the UI can preview a fare without a round-trip per
// seat selection; the authoritative total is still computed server-side.
function listClasses() {
  return {
    reservationChargePerPassenger: RESERVATION_CHARGE,
    gstRate: GST_RATE,
    classes: Object.entries(CLASSES)
      .map(([coach_type, c]) => ({
        coach_type,
        label: c.label,
        seats_per_row: c.seatsPerRow,
        rate_per_km: c.ratePerKm,
        sort_order: c.sortOrder,
      }))
      .sort((a, b) => a.sort_order - b.sort_order),
  };
}

function calculateFare(distanceKm, coachType, passengers = 1) {
  const { ratePerKm } = getClass(coachType);
  const base = Math.round(distanceKm * ratePerKm * passengers);
  const reservation = RESERVATION_CHARGE * passengers;
  const gst = Math.round((base + reservation) * GST_RATE);
  return { base, reservation, gst, total: base + reservation + gst };
}

module.exports = { isValidType, getClass, listClasses, calculateFare };
