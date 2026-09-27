// Timetable times are Indian Railways local time. Pinning the offset keeps
// "already departed" checks identical regardless of the server's timezone.
const IST_OFFSET = "+05:30";

const DAY_MAP = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// Strict YYYY-MM-DD that is also a real calendar date (rejects 2026-02-30).
function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return utc.getUTCFullYear() === y && utc.getUTCMonth() === m - 1 && utc.getUTCDate() === d;
}

// Calendar arithmetic on UTC components, so the result never shifts with the
// server timezone.
function addDays(dateStr, days) {
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + (days || 0)));
  return utc.toISOString().slice(0, 10);
}

function dayOfWeek(dateStr) {
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  return DAY_MAP[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

// journeyDate is the train's run date at its origin; dayOffset moves it to
// the calendar day the stop is actually reached.
function departureInstant(journeyDate, departureTime, dayOffset) {
  if (!departureTime) return null;
  const date = addDays(journeyDate, dayOffset);
  const instant = new Date(`${date}T${departureTime}${IST_OFFSET}`);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

module.exports = { isValidDate, addDays, dayOfWeek, departureInstant };
