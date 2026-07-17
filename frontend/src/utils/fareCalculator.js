const FARE_RATES = { SL: 0.46, "3A": 1.15, "2A": 1.63, "1A": 3.07 };
const RESERVATION_CHARGE = 30;
const GST_RATE = 0.05;

export function calculateFare(distance, coachType, numPassengers = 1) {
  const rate      = FARE_RATES[coachType] || 0.46;
  const base      = Math.round(distance * rate * numPassengers);
  const resCharge = RESERVATION_CHARGE * numPassengers;
  const gst       = Math.round((base + resCharge) * GST_RATE);
  const total     = base + resCharge + gst;
  return { base, resCharge, gst, total };
}

export function formatFare(amount) {
  return `₹ ${amount.toLocaleString("en-IN")}`;
}