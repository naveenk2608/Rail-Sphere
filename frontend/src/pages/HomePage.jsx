import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import Hero from "../components/landing/Hero";
import { getUserFromToken } from "../hooks/useAuth";
import { useClassConfig } from "../hooks/useClassConfig";
import { useReveal } from "../hooks/useReveal";
import { api } from "../utils/api";
import { formatDate, formatTime, departureDateTime, dayShift, stopDate, toDateString } from "../utils/dates";
import { classDisplay } from "../utils/fareCalculator";
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
    <section className="home-section routes" ref={ref} aria-labelledby="routes-title">
      <div className="container">
        <div className="routes-head reveal">
          <div>
            <h2 id="routes-title" className="home-h2">Popular routes</h2>
          </div>
          <p className="routes-note">See today's trains, timings and seat availability.</p>
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

const VALUE = [
  { icon: "search", title: "Fast train search", body: "Every train between your stations on the day you travel, with timings, duration and fares side by side." },
  { icon: "seat", title: "Real-time availability", body: "Seat counts for each class are live, and worked out for the exact journey you choose." },
  { icon: "lock", title: "Secure booking", body: "Pick your seats on the coach map and confirm in one step. A seat is never sold twice for the same journey." },
  { icon: "ticket", title: "PNR tracking", body: "Check any booking with its 12-digit PNR, no login needed. Email or print your e-ticket anytime." },
];

function ValueProps() {
  const ref = useReveal();
  return (
    <section className="home-section value" ref={ref} aria-labelledby="value-title">
      <h2 id="value-title" className="visually-hidden">Why book with Rail-Sphere</h2>
      <div className="container value-grid">
        {VALUE.map((v, i) => (
          <div key={v.title} className="value-item reveal" data-delay={String(i % 4)}>
            <span className="value-icon"><Icon name={v.icon} size={20} /></span>
            <h3>{v.title}</h3>
            <p>{v.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PnrBand() {
  const ref = useReveal();
  const navigate = useNavigate();
  const [pnr, setPnr] = useState("");
  const valid = pnr.length === 12;
  return (
    <section className="home-section pnr-band-wrap" ref={ref}>
      <div className="container">
        <div className="pnr-band reveal">
          <div>
            <h2 className="pnr-band-title">Check your PNR status</h2>
            <p className="pnr-band-sub">See your train, coach, seat and booking status. No login needed.</p>
          </div>
          <form className="pnr-band-form" onSubmit={(e) => { e.preventDefault(); if (valid) navigate(`/pnr-status?pnr=${pnr}`); }}>
            <label htmlFor="home-pnr" className="visually-hidden">12-digit PNR</label>
            <input id="home-pnr" className="pnr-band-input mono" placeholder="Enter 12-digit PNR" inputMode="numeric"
              autoComplete="off" value={pnr} maxLength={12}
              onChange={(e) => setPnr(e.target.value.replace(/\D/g, "").slice(0, 12))} />
            <button type="submit" className="btn btn--light btn--lg" disabled={!valid}>Check status</button>
          </form>
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
      <ValueProps />
      <PopularRoutes />
      <PnrBand />
    </div>
  );
}
