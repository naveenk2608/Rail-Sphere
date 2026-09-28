import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon, { GitHubMark } from "../components/Icon";
import ArchitectureDiagram from "../components/landing/ArchitectureDiagram";
import { useReveal } from "../hooks/useReveal";
import { GITHUB_URL } from "../utils/site";
import "./HowItWorks.css";

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "lifecycle", label: "Life of a booking" },
  { id: "segments", label: "Segment availability" },
  { id: "concurrency", label: "Concurrency" },
  { id: "dates", label: "Dates and time zones" },
  { id: "data-model", label: "Data model" },
  { id: "api", label: "API reference" },
  { id: "run", label: "Run it locally" },
];

// POST /api/bookings, in the order bookingController.createBooking runs it.
const LIFECYCLE = [
  ["Validate the request", "Seat and passenger counts match, at most five seats, a real class and date, and no seat picked twice. Nothing touches the database yet."],
  ["Load route facts", "Sequence numbers, distance and departure time come from train_routes. Anything the client sent about distance or price is ignored."],
  ["Check the calendar", "The train must run on that date (train_run_days), and the departure from the boarding station, in IST, must still be in the future."],
  ["Lock the coaches", "SELECT … FOR UPDATE on the chosen coach rows, in coach_id order. Every other checkout for those coaches now waits in line."],
  ["Re-check each seat", "A locking read against seat_bookings for any confirmed row that overlaps this trip. Any hit returns 409 and the user re-selects."],
  ["Price and write", "The fare is computed from the timetable distance, a random 12-digit PNR is generated (retried on collision), and the booking plus one seat_bookings row per passenger are inserted."],
  ["Commit", "One COMMIT makes it all visible at once, or a rollback leaves nothing behind."],
];

const RESULTS = [
  { label: "Before: seat-range gap locks only", requests: 50, booked: 1, conflict: 40, error: 9 },
  { label: "After: coach lock, then locking re-check", requests: 200, booked: 1, conflict: 199, error: 0 },
];

const TABLES = [
  { name: "users", cols: ["user_id", "name", "email UNIQUE", "password_hash"], note: "bcrypt, 10 rounds" },
  { name: "stations", cols: ["station_id", "station_code UNIQUE", "station_name"], note: "indexed for search" },
  { name: "trains", cols: ["train_id", "train_number UNIQUE", "train_name"] },
  { name: "train_run_days", cols: ["train_id", "day_of_week ENUM"], note: "natural key, no surrogate" },
  { name: "train_routes", cols: ["train_id", "station_id", "seq", "arrival / departure_time", "arrival / departure_day_offset", "distance_from_origin"], note: "the timetable" },
  { name: "coaches", cols: ["coach_id", "train_id", "coach_number", "coach_type ENUM", "total_seats"], note: "row-locked at checkout" },
  { name: "bookings", cols: ["booking_id", "user_id", "train_id", "journey_date", "coach_type", "total_amount", "pnr CHAR(12) UNIQUE", "booking_status"] },
  { name: "seat_bookings", cols: ["booking_id", "coach_id", "seat_no", "from_seq / to_seq", "journey_date · status", "passenger_name · age · gender"], note: "one passenger, one seat, one segment" },
];

const API = [
  ["POST",  "/api/auth/register", false, "Create an account and return a JWT"],
  ["POST",  "/api/auth/login", false, "Log in and return a JWT"],
  ["GET",   "/api/stations/search?q=", false, "Stations by name or code"],
  ["GET",   "/api/trains/search", false, "Trains between two stations for a boarding date"],
  ["GET",   "/api/trains/classes", false, "Class labels, fare rates, seat layout, limits"],
  ["GET",   "/api/trains/fare", false, "Fare for a distance, class and passenger count"],
  ["GET",   "/api/trains/:trainId/route", false, "Every stop with times and distances"],
  ["GET",   "/api/trains/:trainId/coaches", false, "Coaches of a class, with seats per row"],
  ["GET",   "/api/trains/:trainId/seats", false, "Seats taken for a date and segment"],
  ["POST",  "/api/bookings", true, "Book seats in one transaction"],
  ["GET",   "/api/bookings/my", true, "The signed-in user's bookings"],
  ["GET",   "/api/bookings/:bookingId", true, "One booking with passengers"],
  ["PATCH", "/api/bookings/:bookingId/cancel", true, "Cancel before departure"],
  ["POST",  "/api/bookings/:bookingId/email", true, "Email the e-ticket"],
  ["GET",   "/api/bookings/pnr/:pnr", false, "Public PNR status"],
  ["GET",   "/api/passengers/saved", true, "Recent passengers from booking history"],
  ["GET",   "/api/health", false, "Health check"],
];

const RUN = `git clone https://github.com/naveenk2608/Rail-Sphere.git && cd Rail-Sphere
mysql -u root -p < schema.sql && mysql -u root -p < seed.sql

cd backend && npm install
# backend/.env: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME=railsphere_db, JWT_SECRET
npm run dev                      # API on :5000

cd ../frontend && npm install
npm run dev                      # app on :5173, /api proxied to :5000

cd ../backend && npm run test:concurrency   # the double-booking stress test`;

function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" }
    );
    ids.forEach((id) => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

const TOC_IDS = TOC.map((t) => t.id);

function Bar({ value, total, kind }) {
  return <span className={`hw-bar hw-bar--${kind}`} style={{ width: `${(value / total) * 100}%` }} />;
}

export default function HowItWorks() {
  const ref = useReveal();
  const active = useActiveSection(TOC_IDS);

  return (
    <div className="hw" ref={ref}>
      <header className="hw-hero">
        <div className="container">
          <p className="eyebrow">Engineering notes</p>
          <h1 className="hw-title">How Rail-Sphere works</h1>
          <p className="lede hw-lede">
            The design decisions behind segment-level seat allocation, a checkout that
            holds up under concurrent load, and dates that match the timetable. Every
            claim here links back to code in the repository.
          </p>
          <div className="hw-hero-actions">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn btn--primary">
              <GitHubMark size={16} /> Source on GitHub
            </a>
            <Link to="/" className="btn btn--secondary">Try a search</Link>
          </div>
        </div>
      </header>

      <div className="container hw-layout">
        <nav className="hw-toc" aria-label="On this page">
          <div className="hw-toc-title">On this page</div>
          {TOC.map((t) => (
            <a key={t.id} href={`#${t.id}`} className={active === t.id ? "is-active" : ""}
              aria-current={active === t.id ? "location" : undefined}>{t.label}</a>
          ))}
        </nav>

        <article className="hw-body">
          <section id="overview" className="hw-section">
            <h2>Overview</h2>
            <p>
              A React single-page app talks to an Express REST API over JSON. The API owns every
              rule that matters (price, availability, who can cancel what) and keeps its state in
              MySQL 8 with InnoDB, where row locks and transactions do the concurrency work.
            </p>
            <div className="hw-arch reveal"><ArchitectureDiagram /></div>
          </section>

          <section id="lifecycle" className="hw-section">
            <h2>Life of a booking</h2>
            <p>What <code>POST /api/bookings</code> does, in order. Steps 2 to 7 run inside one transaction.</p>
            <ol className="hw-steps">
              {LIFECYCLE.map(([title, body], i) => (
                <li key={title} className="reveal" data-delay={String(i % 3)}>
                  <span className="hw-step-num mono">{i + 1}</span>
                  <div><h3>{title}</h3><p>{body}</p></div>
                </li>
              ))}
            </ol>
          </section>

          <section id="segments" className="hw-section">
            <h2>Segment availability</h2>
            <p>
              Each stop on a route has a sequence number. A booking stores the passenger's{" "}
              <code>from_seq</code> and <code>to_seq</code>, so a seat is only occupied on the
              stretch they actually ride. Two trips conflict exactly when their ranges overlap:
            </p>
            <pre className="hw-code"><code>{`existing.from_seq < requested.to_seq
AND existing.to_seq > requested.from_seq`}</code></pre>
            <p>
              Touching at a station is not an overlap: a passenger getting off at Vijayawada frees
              the berth for someone boarding there. <code>idx_availability (coach_id, journey_date,
              status, from_seq, to_seq)</code> covers the lookup, and <code>journey_date</code> and{" "}
              <code>status</code> are copied onto <code>seat_bookings</code> so the hot path never joins{" "}
              <code>bookings</code>.
            </p>
            <Link to="/#segments" className="hw-inline-link">See it in the interactive demo <Icon name="arrow" size={15} /></Link>
          </section>

          <section id="concurrency" className="hw-section">
            <h2>Concurrency</h2>
            <p>
              Checking a seat and then inserting it is a race: two buyers can both see it free.
              The first version held <code>FOR UPDATE</code> gap locks on the seat range. That
              prevented double-booking, but two such locks don't block each other, so both
              transactions reached <code>INSERT</code>, deadlocked, and one user got a 500.
            </p>
            <p>
              Checkout now locks the coach rows first, in a fixed order. Contending bookings queue on
              that lock, and the seat re-check uses a locking read, so it sees whatever the previous
              holder committed.
            </p>
            <div className="hw-results reveal">
              {RESULTS.map((r) => (
                <div key={r.label} className="hw-result">
                  <div className="hw-result-head">
                    <span>{r.label}</span>
                    <span className="mono">{r.requests} simultaneous requests, one berth</span>
                  </div>
                  <div className="hw-bars" aria-hidden="true">
                    <Bar value={r.booked} total={r.requests} kind="ok" />
                    <Bar value={r.conflict} total={r.requests} kind="conflict" />
                    <Bar value={r.error} total={r.requests} kind="error" />
                  </div>
                  <dl className="hw-result-nums">
                    <div><dt>201 booked</dt><dd className="mono">{r.booked}</dd></div>
                    <div><dt>409 seat taken</dt><dd className="mono">{r.conflict}</dd></div>
                    <div><dt>500 error</dt><dd className={`mono ${r.error ? "is-bad" : ""}`}>{r.error}</dd></div>
                  </dl>
                </div>
              ))}
              <p className="hw-results-note">
                Measured against a local MySQL 8 database. The "after" run is{" "}
                <code>REQUESTS=200 npm run test:concurrency</code> from <code>backend/tests</code>.
              </p>
            </div>
          </section>

          <section id="dates" className="hw-section">
            <h2>Dates and time zones</h2>
            <p>
              <code>bookings.journey_date</code> is the train's run date at its origin, and each stop
              has a day offset. Search works the other way round: you pick the day you board, and the
              API subtracts your station's offset to find which run you mean. The 12863 Howrah Express
              reaches Bhubaneswar at 03:20, so boarding there on Tuesday means Monday's departure
              from Visakhapatnam.
            </p>
            <p>
              Timetable times are Indian Railways local time, so both the server and the browser build
              departure instants with an explicit <code>+05:30</code> offset. "Has this train left?"
              gives the same answer on a server in Oregon and a laptop in Guntur.
            </p>
          </section>

          <section id="data-model" className="hw-section">
            <h2>Data model</h2>
            <p>Eight InnoDB tables. Coach class rates and labels live in a JSON config served to the client, not in the schema.</p>
            <div className="hw-tables">
              {TABLES.map((t, i) => (
                <div key={t.name} className="hw-table reveal" data-delay={String(i % 3)}>
                  <div className="hw-table-name mono">{t.name}</div>
                  <ul>{t.cols.map((c) => <li key={c} className="mono">{c}</li>)}</ul>
                  {t.note && <div className="hw-table-note">{t.note}</div>}
                </div>
              ))}
            </div>
          </section>

          <section id="api" className="hw-section">
            <h2>API reference</h2>
            <p>JSON over HTTPS. Protected routes need <code>Authorization: Bearer &lt;jwt&gt;</code>.</p>
            <div className="hw-api-wrap">
              <table className="hw-api">
                <thead><tr><th scope="col">Method</th><th scope="col">Path</th><th scope="col">Auth</th><th scope="col">Purpose</th></tr></thead>
                <tbody>
                  {API.map(([method, path, auth, desc]) => (
                    <tr key={method + path}>
                      <td><span className={`hw-method hw-method--${method.toLowerCase()}`}>{method}</span></td>
                      <td className="mono">{path}</td>
                      <td>{auth ? <span className="hw-auth"><Icon name="lock" size={13} /> JWT</span> : <span className="hw-public">Public</span>}</td>
                      <td>{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="run" className="hw-section">
            <h2>Run it locally</h2>
            <p>Node 18+ and MySQL 8. The seed data covers five trains across Andhra Pradesh, Telangana, Tamil Nadu, Odisha and West Bengal.</p>
            <pre className="hw-code hw-code--term"><code>{RUN}</code></pre>
          </section>
        </article>
      </div>
    </div>
  );
}
