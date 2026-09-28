import "./JourneySegments.css";

// 12711 Pinakini Express stops (seed.sql), positioned by distance.
const STOPS = [
  { code: "BZA", name: "Vijayawada", km: 0 },
  { code: "TEL", name: "Tenali", km: 32 },
  { code: "OGL", name: "Ongole", km: 137 },
  { code: "NLR", name: "Nellore", km: 250 },
  { code: "GDR", name: "Gudur", km: 289 },
  { code: "MAS", name: "Chennai", km: 431 },
];
const TOTAL = 431;
const TRIPS = [
  { who: "Passenger A", from: "BZA", to: "NLR" },
  { who: "Passenger B", from: "NLR", to: "MAS" },
];
const at = (code) => (STOPS.find((s) => s.code === code).km / TOTAL) * 100;

// One seat, two non-overlapping journeys: a plain picture of why seats free
// up partway along a route.
export default function JourneySegments() {
  return (
    <figure className="js" aria-label="One seat on the Pinakini Express: Passenger A travels Vijayawada to Nellore, then Passenger B uses the same seat from Nellore to Chennai.">
      <div className="js-route" aria-hidden="true">
        <span className="js-line" />
        {STOPS.map((s) => {
          const key = TRIPS.some((t) => t.from === s.code || t.to === s.code);
          return (
            <span key={s.code} className={`js-stop ${key ? "js-stop--key" : ""}`} style={{ left: `${(s.km / TOTAL) * 100}%` }}>
              <i />
              {key && <b className="mono">{s.code}</b>}
              {key && <em>{s.name}</em>}
            </span>
          );
        })}
      </div>
      <div className="js-seat" aria-hidden="true">
        <span className="js-seat-label mono">Seat 23</span>
        <div className="js-seat-track">
          {TRIPS.map((t, i) => (
            <span key={t.who} className={`js-trip js-trip--${i}`}
              style={{ left: `${at(t.from)}%`, width: `${at(t.to) - at(t.from)}%` }}>
              {t.who}
            </span>
          ))}
        </div>
      </div>
      <figcaption className="js-caption">
        Passenger A gets off at Nellore, so the same seat is available to Passenger B from Nellore to Chennai.
      </figcaption>
    </figure>
  );
}
