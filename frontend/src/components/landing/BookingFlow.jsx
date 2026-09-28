import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion, useReveal } from "../../hooks/useReveal";

// Each step shows the request the frontend actually makes and a trimmed
// version of what the backend returns.
const STEPS = [
  {
    key: "search",
    title: "Search",
    summary: "Pick stations and the day you board.",
    detail: "The date is your boarding date. Trains that reach your station after midnight are matched to the day they left their origin, and filtered by the days they actually run.",
    request: "GET /api/trains/search?fromId=3&toId=13&date=2026-10-06",
    response: `[{
  "train_number": "12806",
  "journey_date": "2026-10-06",
  "departure_time": "10:50:00",
  "classes": [
    { "coach_type": "SL", "available_seats": 216, "fare_per_person": 201 },
    { "coach_type": "3A", "available_seats": 128, "fare_per_person": 454 }
  ]
}]`,
  },
  {
    key: "seats",
    title: "Choose seats",
    summary: "A live coach map for your stretch of the route.",
    detail: "The seat map asks only for seats that overlap your from/to sequence. A berth someone leaves before you board shows as free.",
    request: "GET /api/trains/2/seats?coachId=3&date=2026-10-06&fromSeq=3&toSeq=8",
    response: `[7, 12, 31]   // taken for BZA → VSKP only`,
  },
  {
    key: "passengers",
    title: "Passengers",
    summary: "Up to five travellers, one berth each.",
    detail: "Recent co-travellers are suggested from booking history, so there's no separate saved-passenger table to drift out of date.",
    request: "GET /api/passengers/saved",
    response: `[{ "passenger_name": "Priya", "age": 27, "gender": "F" }]`,
  },
  {
    key: "checkout",
    title: "Checkout",
    summary: "One transaction, locked per coach.",
    detail: "The server recomputes distance and fare from the timetable, locks the coach rows, re-checks every seat and writes the booking. If someone got there first, you get a clean 409 instead of a double booking.",
    request: "POST /api/bookings",
    response: `BEGIN;
SELECT … FROM coaches WHERE coach_id IN (3) FOR UPDATE;
SELECT … FROM seat_bookings            -- overlap re-check
 WHERE from_seq < 8 AND to_seq > 3 FOR UPDATE;
INSERT INTO bookings …;  INSERT INTO seat_bookings …;
COMMIT;
→ 201 { "booking_id": 41, "pnr": "481209375521" }`,
  },
  {
    key: "ticket",
    title: "Ticket",
    summary: "PNR, e-ticket and cancellation.",
    detail: "Every booking gets a random 12-digit PNR that anyone can look up without logging in. Tickets can be emailed, printed, or cancelled until the train leaves.",
    request: "GET /api/bookings/pnr/481209375521",
    response: `{
  "booking_status": "CONFIRMED",
  "source_code": "BZA", "dest_code": "VSKP",
  "passengers": [{ "passenger_name": "Priya", "coach_number": "S1", "seat_no": 23 }]
}`,
  },
];

const AUTO_MS = 6000;

export default function BookingFlow() {
  const ref = useReveal();
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(() => !prefersReducedMotion());
  const [paused, setPaused] = useState(false);
  const tabRefs = useRef([]);

  useEffect(() => {
    if (!auto || paused) return undefined;
    const timer = setTimeout(() => setActive((a) => (a + 1) % STEPS.length), AUTO_MS);
    return () => clearTimeout(timer);
  }, [active, auto, paused]);

  function select(i) {
    setAuto(false);
    setActive(i);
  }

  function onKeyDown(e) {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (active + dir + STEPS.length) % STEPS.length;
    select(next);
    tabRefs.current[next]?.focus();
  }

  const step = STEPS[active];

  return (
    <section className="section flow" id="how" ref={ref} aria-labelledby="flow-title">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">How a booking works</p>
          <h2 id="flow-title" className="h2">Five steps, and the server checks every one.</h2>
          <p className="lede">
            The browser never decides a price or a seat. Each step below is a real endpoint,
            with the request it sends and what comes back.
          </p>
        </div>

        <div className="flow-grid reveal" data-delay="1"
          onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
          <div className="flow-steps" role="tablist" aria-label="Booking steps" aria-orientation="vertical" onKeyDown={onKeyDown}>
            {STEPS.map((s, i) => (
              <button key={s.key} ref={(el) => { tabRefs.current[i] = el; }}
                type="button" role="tab" id={`flow-tab-${s.key}`}
                aria-selected={i === active} aria-controls="flow-panel" tabIndex={i === active ? 0 : -1}
                className={`flow-step ${i === active ? "is-active" : ""} ${i < active ? "is-done" : ""}`}
                onClick={() => select(i)}>
                <span className="flow-step-num mono">{String(i + 1).padStart(2, "0")}</span>
                <span className="flow-step-text">
                  <span className="flow-step-title">{s.title}</span>
                  <span className="flow-step-sum">{s.summary}</span>
                </span>
                {i === active && auto && !paused && (
                  <span className="flow-step-timer" style={{ animationDuration: `${AUTO_MS}ms` }} aria-hidden="true" />
                )}
              </button>
            ))}
          </div>

          <div className="flow-panel" id="flow-panel" role="tabpanel" aria-labelledby={`flow-tab-${step.key}`}>
            <div className="flow-panel-inner" key={step.key}>
              <p className="flow-detail">{step.detail}</p>
              <div className="flow-term">
                <div className="flow-term-bar" aria-hidden="true">
                  <i /><i /><i />
                  <span className="mono">rail-sphere api</span>
                </div>
                <div className="flow-term-req mono">
                  <span className="flow-term-method">{step.request.split(" ")[0]}</span>
                  {step.request.slice(step.request.indexOf(" "))}
                </div>
                <pre className="flow-term-res mono"><code>{step.response}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
