import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon, { GitHubMark } from "../components/Icon";
import BookingFlow from "../components/landing/BookingFlow";
import Engineering from "../components/landing/Engineering";
import Features from "../components/landing/Features";
import Hero from "../components/landing/Hero";
import SegmentDemo from "../components/landing/SegmentDemo";
import { getUserFromToken } from "../hooks/useAuth";
import { useClassConfig } from "../hooks/useClassConfig";
import { useReveal } from "../hooks/useReveal";
import { api } from "../utils/api";
import { formatDate, formatTime, departureDateTime, dayShift, stopDate, toDateString } from "../utils/dates";
import { classDisplay } from "../utils/fareCalculator";
import { GITHUB_URL } from "../utils/site";
import "./HomePage.css";

// Only the station pair lives here. Fares, timings and availability come
// from a live search, so the cards can't drift from the timetable.
const POPULAR = [
  { from: "BZA",  to: "VSKP", fromName: "Vijayawada",    toName: "Visakhapatnam", train: "12806 Janmabhoomi" },
  { from: "BZA",  to: "MAS",  fromName: "Vijayawada",    toName: "Chennai",       train: "12711 Pinakini" },
  { from: "SC",   to: "BZA",  fromName: "Secunderabad",  toName: "Vijayawada",    train: "17201 Golconda · 12806" },
  { from: "VSKP", to: "HWH",  fromName: "Visakhapatnam", toName: "Howrah",        train: "12863 Howrah Exp · overnight" },
];

async function findStation(code) {
  const results = await api.searchStations(code);
  return results.find((s) => s.station_code === code) || null;
}

function UpcomingJourneys({ bookings, config }) {
  if (!bookings.length) return null;
  return (
    <section className="upcoming container" aria-labelledby="upcoming-title">
      <div className="upcoming-head">
        <h2 id="upcoming-title">Your upcoming journeys</h2>
        <Link to="/my-bookings" className="upcoming-all">All bookings <Icon name="arrow" size={15} /></Link>
      </div>
      <div className="upcoming-grid">
        {bookings.map((b) => {
          const shift = dayShift(b.departure_day_offset, b.arrival_day_offset);
          return (
            <Link to={`/ticket/${b.booking_id}`} key={b.booking_id} className="journey">
              <div className="journey-top">
                <div>
                  <div className="journey-train">{b.train_name}</div>
                  <div className="journey-meta">{b.train_number} · {classDisplay(config, b.coach_type)}</div>
                </div>
                <span className="journey-badge">Confirmed</span>
              </div>
              <div className="journey-route">
                <div>
                  <div className="journey-code mono">{b.source_code}</div>
                  <div className="journey-time mono">{formatTime(b.departure_time)}</div>
                </div>
                <div className="journey-line" aria-hidden="true"><span /></div>
                <div className="journey-right">
                  <div className="journey-code mono">{b.dest_code}</div>
                  <div className="journey-time mono">
                    {formatTime(b.arrival_time)}{shift && <span className="day-shift">{shift}</span>}
                  </div>
                </div>
              </div>
              <div className="journey-foot">
                <span>{formatDate(stopDate(b.journey_date, b.departure_day_offset))} · {b.passenger_count} pax</span>
                <span className="mono">PNR {b.pnr}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function PopularRoutes() {
  const ref = useReveal();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loadingKey, setLoadingKey] = useState("");

  async function searchPopular(route) {
    setError("");
    setLoadingKey(route.from + route.to);
    try {
      const [from, to] = await Promise.all([findStation(route.from), findStation(route.to)]);
      if (!from || !to) throw new Error("That route is not available right now.");
      const params = new URLSearchParams({
        fromId: from.station_id, toId: to.station_id, date: toDateString(), cls: "ALL",
        fromName: from.station_name, fromCode: from.station_code,
        toName: to.station_name,     toCode: to.station_code,
      });
      navigate(`/search?${params.toString()}`);
    } catch (e) {
      setError(e.message);
      setLoadingKey("");
    }
  }

  return (
    <section className="section routes" ref={ref} aria-labelledby="routes-title">
      <div className="container">
        <div className="routes-head reveal">
          <div>
            <p className="eyebrow">Try it</p>
            <h2 id="routes-title" className="h2">Routes in the sample timetable</h2>
          </div>
          <p className="routes-note">Each one runs a live search for today against the API.</p>
        </div>
        <div className="routes-grid">
          {POPULAR.map((r, i) => (
            <button key={r.from + r.to} type="button" className="route-tile reveal" data-delay={String(i % 4)}
              onClick={() => searchPopular(r)} disabled={loadingKey === r.from + r.to}>
              <span className="route-tile-codes mono">
                {r.from}<Icon name="arrow" size={16} />{r.to}
              </span>
              <span className="route-tile-names">{r.fromName} to {r.toName}</span>
              <span className="route-tile-train mono">{r.train}</span>
              <span className="route-tile-go">
                {loadingKey === r.from + r.to ? "Searching…" : "Today's trains"}
                <Icon name="arrow" size={15} />
              </span>
            </button>
          ))}
        </div>
        {error && <p className="routes-error" role="alert">{error}</p>}
      </div>
    </section>
  );
}

function ClosingCta() {
  const ref = useReveal();
  return (
    <section className="section--tight closing" ref={ref}>
      <div className="container">
        <div className="closing-card reveal">
          <div>
            <h2 className="closing-title">Every line of this is on GitHub.</h2>
            <p className="closing-sub">
              The schema, the locking, the stress test and this page. Clone it, load
              <span className="mono"> seed.sql</span>, and book a berth in about five minutes.
            </p>
          </div>
          <div className="closing-actions">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn btn--light btn--lg">
              <GitHubMark size={17} /> Star on GitHub
            </a>
            <Link to="/pnr-status" className="btn btn--ghost-dark btn--lg">Check a PNR</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const user = getUserFromToken();
  const config = useClassConfig();
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    if (!user) return;
    api.getMyBookings().then(setBookings).catch(() => {});
    // `user` is derived from localStorage on each render, so it is not a
    // stable dependency; Navbar remounts this page on auth change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter before slicing, and compare against departure time rather than
  // midnight, so a train leaving later today still counts as upcoming.
  const now = new Date();
  const upcoming = bookings
    .filter((b) => b.booking_status === "CONFIRMED")
    .map((b) => ({ b, at: departureDateTime(b.journey_date, b.departure_time, b.departure_day_offset) }))
    .filter(({ at }) => at && at >= now)
    .sort((x, y) => x.at - y.at)
    .slice(0, 2)
    .map(({ b }) => b);

  return (
    <div className="home">
      <Hero />
      {user && <UpcomingJourneys bookings={upcoming} config={config} />}
      <SegmentDemo />
      <BookingFlow />
      <Features />
      <Engineering />
      <PopularRoutes />
      <ClosingCta />
    </div>
  );
}
