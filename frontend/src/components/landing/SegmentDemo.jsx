import { useMemo, useState } from "react";
import { useReveal } from "../../hooks/useReveal";

// 12711 Pinakini Express stops from seed.sql.
const STOPS = [
  { code: "BZA", name: "Vijayawada" },
  { code: "TEL", name: "Tenali" },
  { code: "OGL", name: "Ongole" },
  { code: "NLR", name: "Nellore" },
  { code: "GDR", name: "Gudur" },
  { code: "MAS", name: "Chennai" },
];

// Existing bookings on a 16-berth sample coach, as [from, to] stop indexes.
// Same shape as seat_bookings.from_seq / to_seq.
const BOOKINGS = {
  1: [[0, 2]], 2: [[0, 5]], 3: [[2, 5]], 4: [[1, 3]],
  5: [[3, 5]], 6: [], 7: [[0, 1], [3, 5]], 8: [[0, 3]],
  9: [[4, 5]], 10: [[0, 5]], 11: [[1, 2]], 12: [],
  13: [[2, 4]], 14: [[0, 2], [2, 5]], 15: [[3, 4]], 16: [[0, 4]],
};
const SEATS = Object.keys(BOOKINGS).map(Number);

// The rule the backend's availability query applies: an existing booking
// blocks your trip only if it starts before you get off and ends after
// you board.
const overlaps = ([bFrom, bTo], from, to) => bFrom < to && bTo > from;

export default function SegmentDemo() {
  const ref = useReveal();
  const [from, setFrom] = useState(2);
  const [to, setTo] = useState(5);
  const [picking, setPicking] = useState("from");
  const [mode, setMode] = useState("segment");

  function pickStop(i) {
    if (picking === "from") {
      if (i === STOPS.length - 1) return;
      setFrom(i);
      if (to <= i) setTo(i + 1);
      setPicking("to");
    } else {
      if (i <= from) { setFrom(i); if (to <= i) setTo(Math.min(i + 1, STOPS.length - 1)); return; }
      setTo(i);
      setPicking("from");
    }
  }

  const status = useMemo(() => {
    const map = {};
    for (const seat of SEATS) {
      const taken = mode === "segment"
        ? BOOKINGS[seat].some((b) => overlaps(b, from, to))
        : BOOKINGS[seat].length > 0;
      map[seat] = taken ? "taken" : "free";
    }
    return map;
  }, [from, to, mode]);

  const freeSegment = SEATS.filter((s) => !BOOKINGS[s].some((b) => overlaps(b, from, to))).length;
  const freeWhole = SEATS.filter((s) => BOOKINGS[s].length === 0).length;
  const free = mode === "segment" ? freeSegment : freeWhole;
  const tripLabel = `${STOPS[from].code} → ${STOPS[to].code}`;

  return (
    <section className="section demo" id="segments" ref={ref} aria-labelledby="demo-title">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">The idea</p>
          <h2 id="demo-title" className="h2">A berth is only taken where someone is sitting in it.</h2>
          <p className="lede">
            Most booking demos mark a seat sold for the whole train. Rail-Sphere stores
            each booking as a stretch of the route, then checks for overlap. Pick a trip on
            the 12711 Pinakini Express below and watch the same coach open up.
          </p>
        </div>

        <div className="demo-panel reveal" data-delay="1">
          <div className="demo-top">
            <div className="demo-route" role="group" aria-label={`Choose a trip. Now picking the ${picking === "from" ? "boarding" : "destination"} station.`}>
              <div className="demo-route-line" aria-hidden="true">
                <span className="demo-route-fill" style={{
                  left: `${(from / (STOPS.length - 1)) * 100}%`,
                  width: `${((to - from) / (STOPS.length - 1)) * 100}%`,
                }} />
              </div>
              {STOPS.map((s, i) => {
                const state = i === from ? "from" : i === to ? "to" : i > from && i < to ? "via" : "";
                return (
                  <button key={s.code} type="button" className={`demo-stop demo-stop--${state || "off"}`}
                    style={{ left: `${(i / (STOPS.length - 1)) * 100}%` }}
                    onClick={() => pickStop(i)}
                    aria-pressed={i === from || i === to}
                    aria-label={`${s.name} (${s.code})${i === from ? ", boarding" : i === to ? ", destination" : ""}`}>
                    <span className="demo-stop-dot" />
                    <span className="demo-stop-code mono">{s.code}</span>
                    <span className="demo-stop-name">{s.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="demo-hint">
              {picking === "from" ? "Tap a station to set where you board." : "Now tap where you get off."}
            </p>
          </div>

          <div className="demo-body">
            <div className="demo-coach">
              <div className="demo-coach-head">
                <span className="mono">Sample coach · 16 berths</span>
                <div className="demo-toggle" role="radiogroup" aria-label="Allocation model">
                  <button type="button" role="radio" aria-checked={mode === "segment"}
                    className={mode === "segment" ? "is-on" : ""} onClick={() => setMode("segment")}>
                    Segment allocation
                  </button>
                  <button type="button" role="radio" aria-checked={mode === "whole"}
                    className={mode === "whole" ? "is-on" : ""} onClick={() => setMode("whole")}>
                    Whole-route blocking
                  </button>
                </div>
              </div>
              <ul className="demo-seats" aria-label={`Berths free for ${tripLabel}: ${free} of 16`}>
                {SEATS.map((seat) => (
                  <li key={seat} className={`demo-seat demo-seat--${status[seat]}`}
                    title={BOOKINGS[seat].length
                      ? `Booked ${BOOKINGS[seat].map(([a, b]) => `${STOPS[a].code}→${STOPS[b].code}`).join(", ")}`
                      : "No bookings"}>
                    <span className="mono">{seat}</span>
                    <span className="visually-hidden">{status[seat] === "free" ? "free" : "taken"}</span>
                  </li>
                ))}
              </ul>
              <div className="demo-legend" aria-hidden="true">
                <span><i className="demo-seat demo-seat--free" /> Free for {tripLabel}</span>
                <span><i className="demo-seat demo-seat--taken" /> Occupied on part of this trip</span>
              </div>
            </div>

            <div className="demo-side">
              <div className="demo-count" aria-live="polite">
                <span className="demo-count-num mono">{free}</span>
                <span className="demo-count-of">of 16 berths free for {tripLabel}</span>
              </div>
              <div className="demo-compare">
                <div className="demo-compare-row">
                  <span>Segment allocation</span>
                  <span className="mono">{freeSegment}</span>
                  <i style={{ width: `${(freeSegment / 16) * 100}%` }} />
                </div>
                <div className="demo-compare-row demo-compare-row--muted">
                  <span>Whole-route blocking</span>
                  <span className="mono">{freeWhole}</span>
                  <i style={{ width: `${(freeWhole / 16) * 100}%` }} />
                </div>
              </div>
              <pre className="demo-code" aria-label="Availability condition from the backend query"><code>
{`-- blocks the seat only if it starts before
-- you get off and ends after you board
WHERE sb.coach_id = ?
  AND sb.status   = 'CONFIRMED'
  AND sb.from_seq < `}<b>{to + 1}</b>{`   -- ${STOPS[to].code}
  AND sb.to_seq   > `}<b>{from + 1}</b>{`   -- ${STOPS[from].code}`}
              </code></pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
