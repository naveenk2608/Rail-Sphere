// `new Date("2026-07-10")` is parsed as UTC midnight but read back with local
// getters, so in any timezone behind UTC it reports the previous day. These
// helpers always build dates from explicit components instead.

export function parseLocalDate(value) {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDate(value, options = { day: "numeric", month: "short", year: "numeric" }) {
  const date = parseLocalDate(value);
  return date ? date.toLocaleDateString("en-IN", options) : "—";
}

export function formatTime(time) {
  return time ? String(time).slice(0, 5) : "—";
}

// A booking's departure as a real instant, accounting for journeys that
// leave on a later calendar day than the one booked.
export function departureDateTime(journeyDate, time, dayOffset = 0) {
  const date = parseLocalDate(journeyDate);
  if (!date) return null;
  const [h, m, s] = String(time || "00:00:00").split(":").map(Number);
  date.setDate(date.getDate() + (dayOffset || 0));
  date.setHours(h || 0, m || 0, s || 0, 0);
  return date;
}

export function hasDeparted(journeyDate, time, dayOffset = 0) {
  const departure = departureDateTime(journeyDate, time, dayOffset);
  return departure ? departure <= new Date() : false;
}

// Minutes between two TIME values, accounting for day offsets so a 38-hour
// journey is not reported as 14 hours.
export function durationLabel(depTime, arrTime, depOffset = 0, arrOffset = 0) {
  if (!depTime || !arrTime) return "—";
  const [dh, dm] = String(depTime).split(":").map(Number);
  const [ah, am] = String(arrTime).split(":").map(Number);
  const start = (depOffset || 0) * 1440 + dh * 60 + dm;
  const end = (arrOffset || 0) * 1440 + ah * 60 + am;
  let mins = end - start;
  if (mins < 0) mins += 1440;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
