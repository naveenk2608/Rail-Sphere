import { api } from "./api";

// Coach class metadata and fare rates come from the server so they exist in
// exactly one place. Fetched once and shared; the authoritative total is
// still calculated server-side at booking time.
let pending = null;

export function loadClassConfig() {
  if (!pending) {
    pending = api.getClasses().catch((err) => {
      pending = null;
      throw err;
    });
  }
  return pending;
}

export function calculateFare(config, distance, coachType, numPassengers = 1) {
  const cls = config?.classes.find((c) => c.coach_type === coachType);
  if (!cls) return { base: 0, reservation: 0, gst: 0, total: 0 };

  const base = Math.round(distance * cls.rate_per_km * numPassengers);
  const reservation = config.reservationChargePerPassenger * numPassengers;
  const gst = Math.round((base + reservation) * config.gstRate);
  return { base, reservation, gst, total: base + reservation + gst };
}

export function classLabel(config, coachType) {
  return config?.classes.find((c) => c.coach_type === coachType)?.label || coachType;
}

export function seatsPerRow(config, coachType) {
  return config?.classes.find((c) => c.coach_type === coachType)?.seats_per_row || 4;
}

export function formatFare(amount) {
  return `₹ ${Number(amount).toLocaleString("en-IN")}`;
}
