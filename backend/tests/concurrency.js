// Double-booking stress test. Fires N simultaneous bookings for the same seat
// against a running server and checks that exactly one succeeds and every
// other request gets a clean 409, never a 500.
//
//   npm run test:concurrency                      # 100 requests, localhost:5000
//   API_URL=http://localhost:5000/api REQUESTS=300 npm run test:concurrency
//
// Needs the sample data from seed.sql (it books Vijayawada -> Visakhapatnam).
// It creates a throwaway user and real bookings, so point it at a dev
// database, never production.

const API_URL = process.env.API_URL || "http://localhost:5000/api";
const REQUESTS = Number(process.env.REQUESTS || 100);

async function call(method, path, body, token) {
  const res = await fetch(API_URL + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function station(code) {
  const { body } = await call("GET", `/stations/search?q=${code}`);
  const match = body.find((s) => s.station_code === code);
  if (!match) throw new Error(`Station ${code} not found. Did you load seed.sql?`);
  return match;
}

function isoDate(daysAhead) {
  const d = new Date(Date.now() + daysAhead * 86400000);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const from = await station("BZA");
  const to = await station("VSKP");

  // Search a few days ahead until a train with a free sleeper seat turns up.
  let train = null;
  for (let days = 2; days < 30 && !train; days++) {
    const { body } = await call("GET",
      `/trains/search?fromId=${from.station_id}&toId=${to.station_id}&date=${isoDate(days)}&class=SL`);
    train = body.find((t) => t.classes.some((c) => c.available_seats > 0)) || null;
  }
  if (!train) throw new Error("No train with free seats found in the next 30 days.");

  const { body: coaches } = await call("GET", `/trains/${train.train_id}/coaches?class=SL`);
  const coach = coaches[0];
  const { body: booked } = await call("GET",
    `/trains/${train.train_id}/seats?coachId=${coach.coach_id}&date=${train.journey_date}` +
    `&fromSeq=${train.from_seq}&toSeq=${train.to_seq}`);
  const seatNo = Array.from({ length: coach.total_seats }, (_, i) => i + 1)
    .find((n) => !booked.includes(n));

  const { body: auth } = await call("POST", "/auth/register", {
    name: "Concurrency Test",
    email: `concurrency-${Date.now()}@example.com`,
    password: "concurrency-test",
  });

  const booking = {
    train_id: train.train_id,
    journey_date: train.journey_date,
    source_station_id: from.station_id,
    destination_station_id: to.station_id,
    coach_type: "SL",
    seats: [{ coach_id: coach.coach_id, seat_no: seatNo }],
    passengers: [{ passenger_name: "Test Passenger", age: 30, gender: "M" }],
  };

  console.log(`Booking ${train.train_number} coach ${coach.coach_number} seat ${seatNo} ` +
    `on ${train.journey_date}, ${REQUESTS} requests at once...`);

  const started = Date.now();
  const results = await Promise.all(
    Array.from({ length: REQUESTS }, () => call("POST", "/bookings", booking, auth.token))
  );
  const elapsed = Date.now() - started;

  const counts = {};
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
  console.log(`Done in ${elapsed} ms. Responses by status:`, counts);

  const created = counts[201] || 0;
  const conflicts = counts[409] || 0;
  if (created === 1 && conflicts === REQUESTS - 1) {
    console.log("PASS: exactly one booking, every other request got a clean 409.");
  } else {
    console.error("FAIL: expected 1 x 201 and the rest 409.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
